import json
import uuid
from datetime import datetime

import pytest
from sqlmodel import select

from app.models.models import Result, User


def test_create_result(test_db, test_user_in_db):
    """Test creating a result in the database."""
    # Create a result
    basic_plan = json.dumps({
        "mantra": "Test mantra",
        "purpose": "Test purpose"
    })
    
    result = Result(
        user_id=test_user_in_db.id,
        basic_plan=basic_plan,
        full_plan="",
        regeneration_count=0
    )
    
    # Add the result to the database
    test_db.add(result)
    test_db.commit()
    
    # Refresh the result to get the latest data
    test_db.refresh(result)
    
    # Check that the result was created with the correct data
    assert result.id is not None
    assert result.user_id == test_user_in_db.id
    assert result.basic_plan == basic_plan
    assert result.full_plan == ""
    assert result.regeneration_count == 0
    assert result.created_at is not None
    assert result.last_generated_at is not None
    
    # Clean up the result
    test_db.delete(result)
    test_db.commit()


def test_read_result(test_db, test_basic_result_in_db):
    """Test reading a result from the database."""
    # Get the result from the database
    statement = select(Result).where(Result.id == test_basic_result_in_db.id)
    result = test_db.exec(statement).first()
    
    # Check that the result was retrieved with the correct data
    assert result is not None
    assert result.id == test_basic_result_in_db.id
    assert result.user_id == test_basic_result_in_db.user_id
    assert result.basic_plan == test_basic_result_in_db.basic_plan
    assert result.full_plan == test_basic_result_in_db.full_plan
    assert result.regeneration_count == test_basic_result_in_db.regeneration_count


def test_update_result(test_db, test_basic_result_in_db):
    """Test updating a result in the database."""
    # Update the result
    full_plan = json.dumps({
        "mantra": "Updated mantra",
        "purpose": "Updated purpose",
        "next_steps": {
            "today": [],
            "next_7_days": [],
            "next_30_days": [],
            "next_180_days": []
        },
        "daily_plan": {
            "weekdays": {
                "morning": [],
                "afternoon": [],
                "evening": []
            },
            "weekends": {
                "morning": [],
                "afternoon": [],
                "evening": []
            }
        },
        "obstacles": []
    })
    
    test_basic_result_in_db.full_plan = full_plan
    test_basic_result_in_db.regeneration_count = 1
    test_basic_result_in_db.last_generated_at = datetime.utcnow()
    
    # Commit the changes
    test_db.add(test_basic_result_in_db)
    test_db.commit()
    test_db.refresh(test_basic_result_in_db)
    
    # Check that the result was updated with the correct data
    assert test_basic_result_in_db.full_plan == full_plan
    assert test_basic_result_in_db.regeneration_count == 1
    assert test_basic_result_in_db.last_generated_at is not None


def test_delete_result(test_db, test_user_in_db):
    """Test deleting a result from the database."""
    # Create a result to delete
    result = Result(
        user_id=test_user_in_db.id,
        basic_plan='{"mantra": "Delete me", "purpose": "Delete me"}',
        full_plan="",
        regeneration_count=0
    )
    
    # Add the result to the database
    test_db.add(result)
    test_db.commit()
    test_db.refresh(result)
    
    # Get the result ID
    result_id = result.id
    
    # Delete the result
    test_db.delete(result)
    test_db.commit()
    
    # Try to get the result from the database
    statement = select(Result).where(Result.id == result_id)
    db_result = test_db.exec(statement).first()
    
    # Check that the result was deleted
    assert db_result is None


def test_result_user_relationship(test_db, test_user_in_db, test_basic_result_in_db):
    """Test result relationship with user."""
    # Get the result from the database with relationship loaded
    statement = select(Result).where(Result.id == test_basic_result_in_db.id)
    result = test_db.exec(statement).first()
    
    # Check user relationship
    assert result.user is not None
    assert result.user.id == test_user_in_db.id
    assert result.user.name == test_user_in_db.name
    assert result.user.email == test_user_in_db.email


def test_result_uniqueness_per_user(test_db, test_user_in_db, test_basic_result_in_db):
    """Test that a user can only have one result."""
    # Try to create another result for the same user
    duplicate_result = Result(
        user_id=test_user_in_db.id,
        basic_plan='{"mantra": "Duplicate", "purpose": "Duplicate"}',
        full_plan="",
        regeneration_count=0
    )
    
    # Add the duplicate result to the database
    test_db.add(duplicate_result)
    
    # Expect an exception when committing due to unique constraint
    with pytest.raises(Exception) as excinfo:
        test_db.commit()
    
    # Check that the exception is related to uniqueness constraint
    assert "UNIQUE constraint failed" in str(excinfo.value) or "unique constraint" in str(excinfo.value).lower()
    
    # Rollback the transaction
    test_db.rollback()


def test_regeneration_count_increment(test_db, test_basic_result_in_db):
    """Test incrementing the regeneration count."""
    # Get the initial regeneration count
    initial_count = test_basic_result_in_db.regeneration_count
    
    # Increment the regeneration count
    test_basic_result_in_db.regeneration_count += 1
    
    # Commit the changes
    test_db.add(test_basic_result_in_db)
    test_db.commit()
    test_db.refresh(test_basic_result_in_db)
    
    # Check that the regeneration count was incremented
    assert test_basic_result_in_db.regeneration_count == initial_count + 1


def test_update_last_generated_at(test_db, test_basic_result_in_db):
    """Test updating the last_generated_at timestamp."""
    # Get the initial last_generated_at timestamp
    initial_timestamp = test_basic_result_in_db.last_generated_at
    
    # Wait a moment to ensure the timestamp changes
    import time
    time.sleep(0.001)
    
    # Update the last_generated_at timestamp
    test_basic_result_in_db.last_generated_at = datetime.utcnow()
    
    # Commit the changes
    test_db.add(test_basic_result_in_db)
    test_db.commit()
    test_db.refresh(test_basic_result_in_db)
    
    # Check that the last_generated_at timestamp was updated
    assert test_basic_result_in_db.last_generated_at > initial_timestamp
