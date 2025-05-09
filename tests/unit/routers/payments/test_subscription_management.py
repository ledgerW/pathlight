import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import select

from app.models.models import User
from main import app


def test_subscription_cancellation_preserves_history(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test that subscription cancellation preserves subscription ID for history."""
    # Set up the user with an active subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe subscription modification
    mock_stripe.Subscription.modify.return_value = {
        "id": "sub_test_123",
        "status": "active",
        "cancel_at_period_end": True,
        "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    # Cancel the subscription
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify the user's subscription details
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.subscription_status == "canceled"
    assert test_user_in_db.subscription_id == "sub_test_123"  # Should preserve the ID
    assert test_user_in_db.payment_tier == "plan"  # Should downgrade to plan tier


def test_cancel_subscription(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test canceling a subscription."""
    # Set up the user with an active subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe subscription modification
    mock_stripe.Subscription.modify.return_value = {
        "id": "sub_test_123",
        "status": "active",
        "cancel_at_period_end": True,
        "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "Subscription will be canceled" in response.json()["message"]
    
    # Verify Stripe was called correctly
    mock_stripe.Subscription.modify.assert_called_once_with(
        "sub_test_123",
        cancel_at_period_end=True
    )
    
    # Verify the user's subscription status was updated
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.subscription_status == "canceled"
    assert test_user_in_db.subscription_end_date is not None


def test_cancel_subscription_user_not_found(client, mock_stripe, mock_authenticated_user):
    """Test canceling a subscription for a non-existent user."""
    # Generate a random user ID that doesn't exist
    non_existent_user_id = str(uuid.uuid4())
    
    # Make the request
    response = client.post(
        f"/api/payments/{non_existent_user_id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 404
    assert "detail" in response.json()
    assert "User not found" in response.json()["detail"]


def test_cancel_subscription_no_subscription(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test canceling a subscription for a user without a subscription."""
    # Set up the user without a subscription
    test_user_in_db.payment_tier = "plan"
    test_user_in_db.subscription_id = None
    test_user_in_db.subscription_status = None
    test_user_in_db.subscription_end_date = None
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "User does not have an active subscription" in response.json()["detail"]


def test_cancel_subscription_already_canceled(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test canceling a subscription that is already canceled."""
    # Set up the user with a canceled subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "canceled"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 200
    assert "success" in response.json()
    assert response.json()["success"] is True


def test_cancel_subscription_stripe_error(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test handling Stripe errors during subscription cancellation."""
    # Set up the user with an active subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock Stripe to raise an error
    mock_stripe.Subscription.modify.side_effect = Exception("Stripe API error")
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/cancel-subscription"
    )
    
    # Check the response
    assert response.status_code == 500
    assert "detail" in response.json()
    assert "Stripe API error" in response.json()["detail"]


def test_resubscribe(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test resubscribing after cancellation."""
    # Set up the user with a canceled subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "canceled"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe checkout session creation
    mock_stripe.checkout.Session.create.return_value = {
        "id": "cs_test_resub",
        "url": "https://checkout.stripe.com/test/resub",
        "payment_status": "unpaid"
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/resubscribe"
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["session_id"] == "cs_test_resub"
    assert response.json()["checkout_url"] == "https://checkout.stripe.com/test/resub"
    
    # Verify Stripe was called correctly
    mock_stripe.checkout.Session.create.assert_called_once()
    call_kwargs = mock_stripe.checkout.Session.create.call_args[1]
    assert call_kwargs["mode"] == "subscription"
    assert "is_resubscription=true" in call_kwargs["success_url"]


def test_resubscribe_user_not_found(client, mock_stripe, mock_authenticated_user):
    """Test resubscribing for a non-existent user."""
    # Generate a random user ID that doesn't exist
    non_existent_user_id = str(uuid.uuid4())
    
    # Make the request
    response = client.post(
        f"/api/payments/{non_existent_user_id}/resubscribe"
    )
    
    # Check the response
    assert response.status_code == 404
    assert "detail" in response.json()
    assert "User not found" in response.json()["detail"]


def test_resubscribe_no_previous_subscription(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test resubscribing for a user who never had a subscription."""
    # Set up the user without a subscription
    test_user_in_db.payment_tier = "plan"
    test_user_in_db.subscription_id = None
    test_user_in_db.subscription_status = None
    test_user_in_db.subscription_end_date = None
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/resubscribe"
    )
    
    # Check the response
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "User does not have a canceled subscription to reactivate" in response.json()["detail"]


def test_resubscribe_active_subscription(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test resubscribing for a user with an active subscription."""
    # Set up the user with an active subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "active"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/resubscribe"
    )
    
    # Check the response
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "User does not have a canceled subscription to reactivate" in response.json()["detail"]


def test_resubscribe_stripe_error(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test handling Stripe errors during resubscription."""
    # Set up the user with a canceled subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "canceled"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=30)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock Stripe to raise an error
    mock_stripe.checkout.Session.create.side_effect = Exception("Stripe API error")
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/resubscribe"
    )
    
    # Check the response
    assert response.status_code == 500
    assert "detail" in response.json()
    assert "Stripe API error" in response.json()["detail"]
