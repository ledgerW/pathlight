"""
Integration test for the complete subscription flow.

This test creates a real user, simulates subscription creation, cancellation,
and verifies the database state at each step. It uses real API endpoints
but mocks external services like Stripe and Stytch.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from unittest.mock import patch, MagicMock

from main import app
from app.models import User, get_session
from app.routers.payments.payment_utils import has_premium_access


class TestSubscriptionFlowIntegration:
    """Integration test for the complete subscription flow"""
    
    @pytest.fixture
    def client(self):
        """Create a test client"""
        return TestClient(app)
    
    @pytest.fixture
    def test_user_data(self):
        """Test user data"""
        return {
            "name": "Integration Test User",
            "email": f"test-{uuid.uuid4()}@example.com",
            "dob": "1990-01-01T00:00:00Z"
        }
    
    def test_complete_subscription_flow(self, client, test_user_data):
        """Test the complete subscription flow from creation to cancellation"""
        
        created_user_id = None
        
        try:
            # Step 1: Create a user
            response = client.post("/api/users/", json=test_user_data)
            assert response.status_code == 200
            user_data = response.json()
            created_user_id = user_data["id"]
            
            # Verify user was created with correct initial state
            assert user_data["name"] == test_user_data["name"]
            assert user_data["email"] == test_user_data["email"]
            assert user_data["payment_tier"] == "none"
            assert user_data["subscription_id"] is None
            assert user_data["subscription_status"] is None
            assert user_data["subscription_end_date"] is None
            
            # Step 2: Simulate subscription creation (mock Stripe checkout)
            with patch('stripe.checkout.Session.create') as mock_checkout, \
                 patch('stripe.checkout.Session.retrieve') as mock_checkout_retrieve, \
                 patch('stripe.Subscription.retrieve') as mock_sub_retrieve:
                
                # Mock Stripe checkout session creation
                mock_checkout.return_value = MagicMock(
                    id="cs_test_123",
                    url="https://checkout.stripe.com/test",
                    payment_status="paid",
                    mode="subscription",
                    subscription="sub_test_123",
                    metadata={"is_subscription": "true"}
                )
                # Make it behave like a dict too
                mock_checkout.return_value.get = lambda key, default=None: getattr(mock_checkout.return_value, key, default)
                
                # Mock Stripe checkout session retrieval
                mock_checkout_retrieve.return_value = {
                    "id": "cs_test_123",
                    "payment_status": "paid",
                    "mode": "subscription",
                    "subscription": "sub_test_123",
                    "metadata": {"is_subscription": "true"}
                }
                
                # Mock Stripe subscription
                future_timestamp = int((datetime.utcnow() + timedelta(days=30)).timestamp())
                mock_sub_retrieve.return_value = {
                    "id": "sub_test_123",
                    "status": "active",
                    "current_period_end": future_timestamp,
                    "cancel_at_period_end": False
                }
                
                # Create checkout session
                checkout_response = client.post(
                    f"/api/payments/{created_user_id}/create-checkout-session/pursuit"
                )
                assert checkout_response.status_code == 200
                checkout_data = checkout_response.json()
                # Extract session ID from checkout URL
                checkout_url = checkout_data["checkout_url"]
                session_id = "cs_test_123"  # Use our mocked session ID
                
                # Verify payment (simulates successful Stripe payment)
                verify_response = client.post(
                    f"/api/payments/{created_user_id}/verify-payment",
                    json={
                        "session_id": session_id,
                        "tier": "pursuit"
                    }
                )
                assert verify_response.status_code == 200
                verify_data = verify_response.json()
                assert verify_data["payment_verified"] is True
                assert verify_data["tier"] == "pursuit"
                assert verify_data["is_subscription"] is True
            
            # Step 3: Verify user has premium access after subscription
            session = next(get_session())
            user = session.get(User, created_user_id)
            assert user is not None
            assert user.payment_tier == "pursuit"
            assert user.subscription_id == "sub_test_123"
            assert user.subscription_status == "active"
            assert user.subscription_end_date is None  # Active subscriptions don't have end date
            assert has_premium_access(user) is True
            session.close()
            
            # Step 4: Cancel the subscription
            with patch('stripe.Subscription.modify') as mock_cancel:
                # Mock Stripe cancellation
                future_timestamp = int((datetime.utcnow() + timedelta(days=15)).timestamp())
                mock_cancel.return_value = {
                    "id": "sub_test_123",
                    "status": "active",  # Still active until period end
                    "cancel_at_period_end": True,
                    "current_period_end": future_timestamp
                }
                
                cancel_response = client.post(f"/api/payments/{created_user_id}/cancel-subscription")
                assert cancel_response.status_code == 200
                cancel_data = cancel_response.json()
                assert cancel_data["success"] is True
                assert "canceled at the end of the billing period" in cancel_data["message"]
            
            # Step 5: Verify user still has access during grace period
            session = next(get_session())
            user = session.get(User, created_user_id)
            assert user is not None
            assert user.payment_tier == "pursuit"  # Still pursuit during grace period
            assert user.subscription_id == "sub_test_123"
            assert user.subscription_status == "canceled"
            assert user.subscription_end_date is not None
            assert user.subscription_end_date > datetime.utcnow()  # Future date
            assert has_premium_access(user) is True  # Still has access
            session.close()
            
            # Step 6: Simulate subscription expiration
            session = next(get_session())
            user = session.get(User, created_user_id)
            # Manually set end date to past to simulate expiration
            user.subscription_end_date = datetime.utcnow() - timedelta(days=1)
            session.add(user)
            session.commit()
            
            # Verify user no longer has premium access
            assert has_premium_access(user) is False
            session.close()
            
            # Step 7: Run cleanup task to verify it works
            from app.tasks.subscription_cleanup import cleanup_expired_subscriptions
            cleanup_result = cleanup_expired_subscriptions()
            assert cleanup_result["success"] is True
            assert cleanup_result["users_downgraded"] >= 1
            
            # Step 8: Verify user was downgraded
            session = next(get_session())
            user = session.get(User, created_user_id)
            assert user is not None
            assert user.payment_tier == "purpose"  # Downgraded
            assert user.subscription_id is None  # Cleared
            assert user.subscription_status is None  # Cleared
            assert user.subscription_end_date is None  # Cleared
            assert has_premium_access(user) is False
            session.close()
            
            print("✅ Complete subscription flow test passed!")
            
        finally:
            # Cleanup: Delete the test user
            if created_user_id:
                try:
                    session = next(get_session())
                    user = session.get(User, created_user_id)
                    if user:
                        # Delete any related form responses and results first
                        from app.models import FormResponse, Result
                        
                        # Delete form responses
                        form_responses = session.exec(
                            select(FormResponse).where(FormResponse.user_id == created_user_id)
                        ).all()
                        for response in form_responses:
                            session.delete(response)
                        
                        # Delete results
                        result = session.exec(
                            select(Result).where(Result.user_id == created_user_id)
                        ).first()
                        if result:
                            session.delete(result)
                        
                        # Delete user
                        session.delete(user)
                        session.commit()
                        print(f"✅ Cleaned up test user {created_user_id}")
                    session.close()
                except Exception as e:
                    print(f"⚠️ Error cleaning up test user: {e}")


if __name__ == "__main__":
    # Allow running the test directly
    import sys
    import os
    
    # Add the project root to the path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
    
    test_class = TestSubscriptionFlowIntegration()
    client = TestClient(app)
    
    test_user_data = {
        "name": "Integration Test User",
        "email": f"test-{uuid.uuid4()}@example.com",
        "dob": "1990-01-01T00:00:00Z"
    }
    
    print("Running complete subscription flow integration test...")
    test_class.test_complete_subscription_flow(client, test_user_data)
    print("Integration test completed!")
