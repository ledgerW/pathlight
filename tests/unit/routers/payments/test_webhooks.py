import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import select

from app.models.models import User
from main import app


def test_webhook_subscription_created(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a subscription.created webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_subscription_created",
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_test_123",
                "status": "active",
                "customer": "cus_test_123",
                "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify Stripe was called correctly
    mock_stripe.Webhook.construct_event.assert_called_once()


def test_webhook_subscription_past_due(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a subscription.updated webhook event with past_due status."""
    # Set up the user with an active subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event for past_due status
    event_data = {
        "id": "evt_test_subscription_past_due",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_123",
                "status": "past_due",
                "customer": "cus_test_123",
                "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify the user's subscription status was updated
    user = test_db.exec(select(User).where(User.id == test_user_in_db.id)).first()
    assert user.subscription_status == "past_due"
    assert user.payment_tier == "pursuit"  # Should remain pursuit tier


def test_webhook_subscription_updated(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a subscription.updated webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    new_end_date = datetime.utcnow() + timedelta(days=60)
    event_data = {
        "id": "evt_test_subscription_updated",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_123",
                "status": "active",
                "customer": "cus_test_123",
                "current_period_end": int(new_end_date.timestamp())
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify the user's subscription details were updated
    user = test_db.exec(select(User).where(User.id == test_user_in_db.id)).first()
    assert user.subscription_status == "active"
    assert user.subscription_end_date.date() == new_end_date.date()


def test_webhook_subscription_deleted(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a subscription.deleted webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_subscription_deleted",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_test_123",
                "status": "canceled",
                "customer": "cus_test_123",
                "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify the user's subscription details were updated
    user = test_db.exec(select(User).where(User.id == test_user_in_db.id)).first()
    assert user.subscription_status == "canceled"


def test_webhook_payment_succeeded(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a payment_intent.succeeded webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "purpose"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_payment_succeeded",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "status": "succeeded",
                "customer": "cus_test_123",
                "amount": 99,  # $0.99 for purpose tier
                "currency": "usd",
                "receipt_email": test_user_in_db.email
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_webhook_payment_failed(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a payment_intent.payment_failed webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "purpose"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_payment_failed",
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_test_123",
                "status": "failed",
                "customer": "cus_test_123",
                "amount": 99,  # $0.99 for purpose tier
                "currency": "usd",
                "receipt_email": test_user_in_db.email,
                "last_payment_error": {
                    "message": "Your card was declined."
                }
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_webhook_checkout_session_completed(client, mock_stripe, test_db, test_user_in_db):
    """Test handling a checkout.session.completed webhook event."""
    # Set up the user
    test_user_in_db.payment_tier = "none"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_checkout_completed",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "status": "complete",
                "customer": "cus_test_123",
                "customer_email": test_user_in_db.email,
                "payment_status": "paid",
                "amount_total": 99,  # $0.99 for purpose tier
                "currency": "usd",
                "mode": "payment"
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_webhook_signature_verification_failed(client, mock_stripe):
    """Test handling a webhook with invalid signature."""
    # Mock the Stripe webhook event construction to raise an error
    mock_stripe.Webhook.construct_event.side_effect = Exception("Invalid signature")
    
    # Create a webhook event
    event_data = {
        "id": "evt_test_invalid",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "status": "complete"
            }
        }
    }
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "invalid_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "Invalid signature" in response.json()["detail"]


def test_webhook_unsupported_event_type(client, mock_stripe):
    """Test handling an unsupported webhook event type."""
    # Create a webhook event with an unsupported type
    event_data = {
        "id": "evt_test_unsupported",
        "type": "unsupported.event.type",
        "data": {
            "object": {
                "id": "obj_test_123"
            }
        }
    }
    
    # Mock the Stripe webhook event construction
    mock_stripe.Webhook.construct_event.return_value = event_data
    
    # Make the request
    response = client.post(
        "/api/payments/webhook",
        headers={"stripe-signature": "test_signature"},
        content=json.dumps(event_data)
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["status"] == "success"
