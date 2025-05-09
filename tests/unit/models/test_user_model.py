import uuid
from datetime import datetime

import pytest
from sqlmodel import select

from app.models.models import User
from app.models.database import get_session


def test_create_user(test_db):
    """Test creating a user in the database."""
    # Create a user
    user = User(
        name="Test User",
        email="test@example.com",
        dob=datetime.utcnow(),
        progress_state="0",
        payment_tier="none"
    )
    
    # Add the user to the database
    test_db.add(user)
    test_db.commit()
    
    # Refresh the user to get the latest data
    test_db.refresh(user)
    
    # Check that the user was created with the correct data
    assert user.id is not None
    assert user.name == "Test User"
    assert user.email == "test@example.com"
    assert user.progress_state == "0"
    assert user.payment_tier == "none"
    assert user.created_at is not None
    assert user.updated_at is not None
    assert user.subscription_id is None
    assert user.subscription_status is None
    assert user.subscription_end_date is None


def test_read_user(test_db, test_user_in_db):
    """Test reading a user from the database."""
    # Get the user from the database
    statement = select(User).where(User.id == test_user_in_db.id)
    result = test_db.exec(statement).first()
    
    # Check that the user was retrieved with the correct data
    assert result is not None
    assert result.id == test_user_in_db.id
    assert result.name == test_user_in_db.name
    assert result.email == test_user_in_db.email
    assert result.progress_state == test_user_in_db.progress_state
    assert result.payment_tier == test_user_in_db.payment_tier


def test_update_user(test_db, test_user_in_db):
    """Test updating a user in the database."""
    # Update the user
    test_user_in_db.name = "Updated Name"
    test_user_in_db.progress_state = "10"
    test_user_in_db.payment_tier = "plan"
    
    # Commit the changes
    test_db.add(test_user_in_db)
    test_db.commit()
    test_db.refresh(test_user_in_db)
    
    # Check that the user was updated with the correct data
    assert test_user_in_db.name == "Updated Name"
    assert test_user_in_db.progress_state == "10"
    assert test_user_in_db.payment_tier == "plan"


def test_delete_user(test_db):
    """Test deleting a user from the database."""
    # Create a user to delete
    user = User(
        name="Delete Me",
        email="delete@example.com",
        dob=datetime.utcnow(),
        progress_state="0",
        payment_tier="none"
    )
    
    # Add the user to the database
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    # Get the user ID
    user_id = user.id
    
    # Delete the user
    test_db.delete(user)
    test_db.commit()
    
    # Try to get the user from the database
    statement = select(User).where(User.id == user_id)
    result = test_db.exec(statement).first()
    
    # Check that the user was deleted
    assert result is None


def test_user_relationships(test_db, test_user_in_db, test_form_responses_in_db, test_basic_result_in_db):
    """Test user relationships with form responses and results."""
    # Get the user from the database with relationships loaded
    statement = select(User).where(User.id == test_user_in_db.id)
    user = test_db.exec(statement).first()
    
    # Check form responses relationship
    assert len(user.form_responses) == 5
    for response in user.form_responses:
        assert response.user_id == user.id
        assert 1 <= response.question_number <= 5
        assert response.response.startswith("Test response")
    
    # Check result relationship
    assert user.result is not None
    assert user.result.user_id == user.id
    assert "Test mantra" in user.result.basic_plan
    assert "Test purpose" in user.result.basic_plan


def test_user_dob_validator():
    """Test the date of birth validator."""
    # Create a user with a datetime object
    dob = datetime(2000, 1, 1)
    user = User(
        name="Test User",
        email="test@example.com",
        dob=dob,
        progress_state="0",
        payment_tier="none"
    )
    
    # Check that the dob field is stored correctly
    assert user.dob == dob
    
    # When we save and retrieve from the database, the validator should be applied
    test_db = next(get_session())
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    # Clean up
    test_db.delete(user)
    test_db.commit()
