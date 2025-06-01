"""
Tests for the subscription cancellation fix.

This module tests the new premium access logic to ensure:
1. Active subscriptions grant premium access
2. Canceled subscriptions grant access until subscription_end_date
3. Expired subscriptions deny access
4. The has_premium_access function works correctly
"""

import pytest
from datetime import datetime, timedelta
from app.models.models import User
from app.routers.payments.payment_utils import has_premium_access
import uuid

class TestSubscriptionFix:
    """Test cases for the subscription cancellation fix"""
    
    def test_active_subscription_has_access(self):
        """Test that users with active subscriptions have premium access"""
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id="sub_123",
            subscription_status="active",
            subscription_end_date=None  # Active subscriptions don't have end date
        )
        
        assert has_premium_access(user) == True
    
    def test_canceled_subscription_within_period_has_access(self):
        """Test that canceled subscriptions still have access until end date"""
        future_date = datetime.utcnow() + timedelta(days=15)
        
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id="sub_123",
            subscription_status="canceled",
            subscription_end_date=future_date
        )
        
        assert has_premium_access(user) == True
    
    def test_canceled_subscription_expired_no_access(self):
        """Test that expired canceled subscriptions don't have access"""
        past_date = datetime.utcnow() - timedelta(days=1)
        
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id="sub_123",
            subscription_status="canceled",
            subscription_end_date=past_date
        )
        
        assert has_premium_access(user) == False
    
    def test_non_pursuit_tier_no_access(self):
        """Test that users without pursuit tier don't have premium access"""
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="purpose",
            subscription_id=None,
            subscription_status=None,
            subscription_end_date=None
        )
        
        assert has_premium_access(user) == False
    
    def test_legacy_user_with_pursuit_tier_has_access(self):
        """Test that legacy users with pursuit tier but no subscription info have access"""
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id=None,
            subscription_status=None,
            subscription_end_date=None
        )
        
        assert has_premium_access(user) == True
    
    def test_past_due_subscription_no_access(self):
        """Test that past_due subscriptions don't have access"""
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id="sub_123",
            subscription_status="past_due",
            subscription_end_date=None
        )
        
        assert has_premium_access(user) == False
    
    def test_canceled_subscription_no_end_date_no_access(self):
        """Test that canceled subscriptions without end date don't have access"""
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            email="test@example.com",
            dob=datetime(1990, 1, 1),
            payment_tier="pursuit",
            subscription_id="sub_123",
            subscription_status="canceled",
            subscription_end_date=None
        )
        
        assert has_premium_access(user) == False

if __name__ == "__main__":
    # Allow running tests directly
    test_class = TestSubscriptionFix()
    
    print("Running subscription fix tests...")
    
    test_methods = [
        test_class.test_active_subscription_has_access,
        test_class.test_canceled_subscription_within_period_has_access,
        test_class.test_canceled_subscription_expired_no_access,
        test_class.test_non_pursuit_tier_no_access,
        test_class.test_legacy_user_with_pursuit_tier_has_access,
        test_class.test_past_due_subscription_no_access,
        test_class.test_canceled_subscription_no_end_date_no_access
    ]
    
    passed = 0
    failed = 0
    
    for test_method in test_methods:
        try:
            test_method()
            print(f"✓ {test_method.__name__}")
            passed += 1
        except Exception as e:
            print(f"✗ {test_method.__name__}: {e}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
