import uuid
from datetime import datetime

import pytest
from sqlmodel import select

from app.models.models import FormResponse, User


def test_create_form_response(test_db, test_user_in_db):
    """Test creating a form response in the database."""
    # Create a form response
    form_response = FormResponse(
        user_id=test_user_in_db.id,
        question_number=1,
        response="Test response for question 1"
    )
    
    # Add the form response to the database
    test_db.add(form_response)
    test_db.commit()
    
    # Refresh the form response to get the latest data
    test_db.refresh(form_response)
    
    # Check that the form response was created with the correct data
    assert form_response.id is not None
    assert form_response.user_id == test_user_in_db.id
    assert form_response.question_number == 1
    assert form_response.response == "Test response for question 1"
    assert form_response.created_at is not None
    
    # Clean up the form response
    test_db.delete(form_response)
    test_db.commit()


def test_read_form_response(test_db, test_form_responses_in_db):
    """Test reading a form response from the database."""
    # Get the first form response
    form_response = test_form_responses_in_db[0]
    
    # Get the form response from the database
    statement = select(FormResponse).where(FormResponse.id == form_response.id)
    result = test_db.exec(statement).first()
    
    # Check that the form response was retrieved with the correct data
    assert result is not None
    assert result.id == form_response.id
    assert result.user_id == form_response.user_id
    assert result.question_number == form_response.question_number
    assert result.response == form_response.response


def test_update_form_response(test_db, test_form_responses_in_db):
    """Test updating a form response in the database."""
    # Get the first form response
    form_response = test_form_responses_in_db[0]
    
    # Update the form response
    form_response.response = "Updated response"
    
    # Commit the changes
    test_db.add(form_response)
    test_db.commit()
    test_db.refresh(form_response)
    
    # Check that the form response was updated with the correct data
    assert form_response.response == "Updated response"


def test_delete_form_response(test_db, test_user_in_db):
    """Test deleting a form response from the database."""
    # Create a form response to delete
    form_response = FormResponse(
        user_id=test_user_in_db.id,
        question_number=10,
        response="Delete me"
    )
    
    # Add the form response to the database
    test_db.add(form_response)
    test_db.commit()
    test_db.refresh(form_response)
    
    # Get the form response ID
    form_response_id = form_response.id
    
    # Delete the form response
    test_db.delete(form_response)
    test_db.commit()
    
    # Try to get the form response from the database
    statement = select(FormResponse).where(FormResponse.id == form_response_id)
    result = test_db.exec(statement).first()
    
    # Check that the form response was deleted
    assert result is None


def test_form_response_user_relationship(test_db, test_user_in_db, test_form_responses_in_db):
    """Test form response relationship with user."""
    # Get the first form response
    form_response = test_form_responses_in_db[0]
    
    # Get the form response from the database with relationship loaded
    statement = select(FormResponse).where(FormResponse.id == form_response.id)
    result = test_db.exec(statement).first()
    
    # Check user relationship
    assert result.user is not None
    assert result.user.id == test_user_in_db.id
    assert result.user.name == test_user_in_db.name
    assert result.user.email == test_user_in_db.email


def test_form_response_user_id_validator(test_db):
    """Test the user_id validator."""
    # Create a test user first
    test_user = User(
        name="Validator Test User",
        email="validator_test@example.com",
        dob=datetime.utcnow(),
        progress_state="0",
        payment_tier="none"
    )
    test_db.add(test_user)
    test_db.commit()
    test_db.refresh(test_user)
    
    # Test with UUID object directly
    form_response = FormResponse(
        user_id=test_user.id,  # This is already a UUID object
        question_number=1,
        response="Test response"
    )
    
    # Add to database
    test_db.add(form_response)
    test_db.commit()
    test_db.refresh(form_response)
    
    # Check that the user_id is a UUID
    assert isinstance(form_response.user_id, uuid.UUID)
    assert form_response.user_id == test_user.id
    
    # Clean up
    test_db.delete(form_response)
    test_db.delete(test_user)
    test_db.commit()


def test_multiple_form_responses_per_user(test_db, test_user_in_db):
    """Test creating multiple form responses for a single user."""
    # Create multiple form responses
    responses = []
    for i in range(1, 6):
        response = FormResponse(
            user_id=test_user_in_db.id,
            question_number=i,
            response=f"New test response {i}"
        )
        test_db.add(response)
        responses.append(response)
    
    # Commit the changes
    test_db.commit()
    
    # Get all form responses for the user
    statement = select(FormResponse).where(FormResponse.user_id == test_user_in_db.id)
    results = test_db.exec(statement).all()
    
    # Check that all form responses were created
    assert len(results) >= 5  # There might be existing responses from fixtures
    
    # Clean up
    for response in responses:
        test_db.delete(response)
    test_db.commit()
