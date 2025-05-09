import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status, Request
from fastapi.testclient import TestClient
from sqlmodel import select

from app.models.models import User
from main import app

# Mock the Request.json method for tests
@pytest.fixture
def mock_request_json(monkeypatch):
    async def mock_json(self):
        # This will be overridden in each test
        return {}
    
    # Apply the mock to Request.json
    monkeypatch.setattr(Request, "json", mock_json)
    return mock_json


def test_verify_payment_purpose_tier(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying payment for the Purpose tier."""
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_purpose",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "payment"
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_purpose", "tier": "purpose"}
    )
    
    # Print the response content for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.content}")
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert "tier" in response.json()
    
    # Verify Stripe was called correctly
    mock_stripe.checkout.Session.retrieve.assert_called_once()
    
    # Verify the user's payment tier was updated
    # Refresh the user from the database
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "purpose"


def test_verify_payment_plan_tier(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying payment for the Plan tier."""
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_plan",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "payment"
    }
    
    # Set the initial payment tier to none
    test_user_in_db.payment_tier = "none"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_plan", "tier": "plan"}
    )
    
    # Print the response content for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.content}")
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["tier"] == "plan"
    
    # Verify the user's payment tier was updated
    # Refresh the user from the database
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "plan"


def test_verify_payment_pursuit_tier(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying payment for the Pursuit tier (subscription)."""
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_pursuit",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "subscription",
        "subscription": "sub_test_123"
    }
    
    # Mock the Stripe subscription retrieval
    mock_stripe.Subscription.retrieve.return_value = {
        "id": "sub_test_123",
        "status": "active",
        "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_pursuit", "tier": "pursuit"}
    )
    
    # Print the response content for debugging
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.content}")
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["tier"] == "pursuit"
    assert response.json()["is_subscription"] is True
    
    # Verify the user's payment tier and subscription details were updated
    # Refresh the user from the database
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "pursuit"
    assert test_user_in_db.subscription_id == "sub_test_123"
    assert test_user_in_db.subscription_status == "active"
    # For active subscriptions, subscription_end_date should be None
    assert test_user_in_db.subscription_end_date is None


def test_verify_payment_unpaid(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying an unpaid payment."""
    # Set the initial payment tier
    test_user_in_db.payment_tier = "none"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_unpaid",
        "payment_status": "unpaid",
        "customer_details": {"email": test_user_in_db.email}
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_unpaid", "tier": "purpose"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is False
    
    # Verify the user's payment tier was not updated
    # Refresh the user from the database
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "none"


def test_verify_payment_user_not_found(client, mock_stripe, mock_authenticated_user):
    """Test verifying payment for a non-existent user."""
    # Generate a random user ID that doesn't exist
    non_existent_user_id = str(uuid.uuid4())
    
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_user_not_found",
        "payment_status": "paid",
        "customer_details": {"email": "nonexistent@example.com"}
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{non_existent_user_id}/verify-payment",
        json={"session_id": "cs_test_user_not_found", "tier": "purpose"}
    )
    
    # Check the response
    assert response.status_code == 404
    assert "detail" in response.json()
    assert "User not found" in response.json()["detail"]


def test_verify_payment_invalid_tier(client, mock_stripe, mock_authenticated_user, test_user_in_db):
    """Test verifying payment with an invalid tier."""
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_invalid_tier",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email}
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_invalid_tier", "tier": "invalid"}
    )
    
    # Check the response
    assert response.status_code == 400
    assert "detail" in response.json()
    assert "Invalid tier" in response.json()["detail"]


def test_verify_payment_stripe_error(client, mock_stripe, mock_authenticated_user, test_user_in_db):
    """Test handling Stripe errors during payment verification."""
    # Mock Stripe to raise an error
    mock_stripe.checkout.Session.retrieve.side_effect = Exception("Stripe API error")
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_error", "tier": "purpose"}
    )
    
    # Check the response
    assert response.status_code == 500
    assert "detail" in response.json()


def test_verify_payment_email_mismatch(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying payment with mismatched email."""
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_email_mismatch",
        "payment_status": "paid",
        "customer_details": {"email": "different@example.com"}
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_email_mismatch", "tier": "purpose"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert "payment_verified" in response.json()


def test_verify_payment_subscription_payment_failed(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying a failed subscription payment."""
    # Set the initial payment tier to none
    test_user_in_db.payment_tier = "none"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe checkout session retrieval with failed payment
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_failed",
        "payment_status": "unpaid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "subscription"
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_failed", "tier": "pursuit"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is False
    
    # Verify the user's payment tier was not updated
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "none"  # Should remain unchanged
    assert test_user_in_db.subscription_id is None


def test_verify_payment_regeneration(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db, test_basic_result_in_db):
    """Test verifying payment for regeneration."""
    # Set up the user with plan tier
    test_user_in_db.payment_tier = "plan"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Get initial regeneration count
    initial_count = test_basic_result_in_db.regeneration_count
    
    # Mock the Stripe checkout session retrieval with regeneration metadata
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_regeneration",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "payment",
        "metadata": {
            "is_regeneration": "true"
        }
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_regeneration", "tier": "plan"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["is_regeneration"] is True
    
    # Verify the regeneration count was incremented
    test_db.refresh(test_basic_result_in_db)
    assert test_basic_result_in_db.regeneration_count == initial_count + 1


def test_direct_update_subscription_status(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test direct update of subscription status."""
    # Set up the user with a subscription ID but incorrect status
    test_user_in_db.payment_tier = "plan"
    test_user_in_db.subscription_id = "sub_test_123"
    test_user_in_db.subscription_status = "canceled"
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe subscription retrieval
    mock_stripe.Subscription.retrieve.return_value = {
        "id": "sub_test_123",
        "status": "active",
        "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    # Make the direct update request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "direct-update", "tier": "pursuit"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["tier"] == "pursuit"
    assert response.json()["direct_update"] is True
    
    # Verify the user's subscription details were updated
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "pursuit"
    assert test_user_in_db.subscription_status == "active"


def test_direct_update_force_active(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test direct update with force_active flag."""
    # Set up the user without a subscription
    test_user_in_db.payment_tier = "plan"
    test_user_in_db.subscription_id = None
    test_user_in_db.subscription_status = None
    test_user_in_db.subscription_end_date = None
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Make the direct update request with force_active=true
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "direct-update", "tier": "pursuit", "force_active": True}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["tier"] == "pursuit"
    assert response.json()["direct_update"] is True
    
    # Verify the user's subscription details were updated
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "pursuit"
    assert test_user_in_db.subscription_status == "active"
    assert test_user_in_db.subscription_id is not None
    # For active subscriptions with force_active=True, subscription_end_date should be None
    assert test_user_in_db.subscription_end_date is None


def test_verify_payment_resubscription(client, mock_stripe, mock_authenticated_user, test_db, test_user_in_db):
    """Test verifying payment for resubscription."""
    # Set up the user with a canceled subscription
    test_user_in_db.payment_tier = "pursuit"
    test_user_in_db.subscription_id = "sub_old_123"
    test_user_in_db.subscription_status = "canceled"
    test_user_in_db.subscription_end_date = datetime.utcnow() + timedelta(days=5)
    test_db.add(test_user_in_db)
    test_db.commit()
    
    # Mock the Stripe checkout session retrieval
    mock_stripe.checkout.Session.retrieve.return_value = {
        "id": "cs_test_resub",
        "payment_status": "paid",
        "customer_details": {"email": test_user_in_db.email},
        "mode": "subscription",
        "subscription": "sub_new_123"
    }
    
    # Mock the Stripe subscription retrieval
    mock_stripe.Subscription.retrieve.return_value = {
        "id": "sub_new_123",
        "status": "active",
        "current_period_end": int((datetime.utcnow() + timedelta(days=30)).timestamp())
    }
    
    # Make the request
    response = client.post(
        f"/api/payments/{test_user_in_db.id}/verify-payment",
        json={"session_id": "cs_test_resub", "tier": "pursuit"}
    )
    
    # Check the response
    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["tier"] == "pursuit"
    
    # Verify the user's subscription details were updated
    # Refresh the user from the database
    test_db.refresh(test_user_in_db)
    assert test_user_in_db.payment_tier == "pursuit"
    assert test_user_in_db.subscription_id == "sub_new_123"
    assert test_user_in_db.subscription_status == "active"
    # For active subscriptions, subscription_end_date should be None
    assert test_user_in_db.subscription_end_date is None
