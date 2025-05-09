import os
import uuid
from datetime import datetime
from typing import Generator, List

import pytest
from fastapi.testclient import TestClient
from pytest_mock import MockerFixture
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.models.models import User, FormResponse, Result
from app.models.database import get_session
from app.routers.ai.ai_models import SummaryOutput, FullPlanOutput
from main import app


# Database fixtures
@pytest.fixture
def test_db_engine():
    """Create an in-memory SQLite database engine for testing."""
    # Use pure in-memory SQLite database without a file
    # This prevents the file::memory: file from being created
    TEST_DATABASE_URL = "sqlite://"
    
    # Create a test engine with StaticPool to maintain a single connection
    test_engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    
    # Create all tables
    SQLModel.metadata.create_all(test_engine)
    
    # Return the engine
    yield test_engine
    
    # Drop all tables after tests
    SQLModel.metadata.drop_all(test_engine)
    
    # Explicitly close connections and dispose of the engine
    test_engine.dispose()


@pytest.fixture
def test_db(test_db_engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    with Session(test_db_engine) as session:
        yield session


@pytest.fixture
def client(test_db_engine) -> TestClient:
    """Create a test client with a test database session."""
    # Override the get_session dependency to use our test database
    def override_get_session():
        with Session(test_db_engine) as session:
            yield session
    
    # Override the dependency in the app
    app.dependency_overrides[get_session] = override_get_session
    
    # Create and return a test client
    with TestClient(app) as client:
        yield client
    
    # Remove the override after the test
    app.dependency_overrides.clear()


# Test data fixtures
@pytest.fixture
def test_user() -> User:
    """Create a test user for testing."""
    return User(
        id=uuid.uuid4(),
        name="Test User",
        email="test@example.com",
        dob=datetime.utcnow(),
        progress_state="5",
        payment_tier="purpose"
    )


@pytest.fixture
def test_user_in_db(test_db, test_user) -> User:
    """Add a test user to the database and return it."""
    test_db.add(test_user)
    test_db.commit()
    test_db.refresh(test_user)
    yield test_user
    
    # Clean up after the test
    # First, delete any results associated with the user to avoid foreign key constraint issues
    from sqlmodel import select
    from app.models.models import Result
    results = test_db.exec(select(Result).where(Result.user_id == test_user.id)).all()
    for result in results:
        test_db.delete(result)
    
    # Now delete the user
    test_db.delete(test_user)
    test_db.commit()


@pytest.fixture
def test_form_responses(test_user) -> List[FormResponse]:
    """Create test form responses for the first 5 questions."""
    responses = []
    for i in range(1, 6):
        responses.append(
            FormResponse(
                user_id=test_user.id,
                question_number=i,
                response=f"Test response {i}"
            )
        )
    return responses


@pytest.fixture
def test_form_responses_in_db(test_db, test_user_in_db) -> List[FormResponse]:
    """Add test form responses to the database and return them."""
    responses = []
    for i in range(1, 6):
        response = FormResponse(
            user_id=test_user_in_db.id,
            question_number=i,
            response=f"Test response {i}"
        )
        test_db.add(response)
        responses.append(response)
    
    test_db.commit()
    for response in responses:
        test_db.refresh(response)
    
    yield responses
    
    # Clean up after the test
    for response in responses:
        test_db.delete(response)
    test_db.commit()


@pytest.fixture
def test_all_form_responses(test_user) -> List[FormResponse]:
    """Create test form responses for all 25 questions."""
    responses = []
    for i in range(1, 26):
        responses.append(
            FormResponse(
                user_id=test_user.id,
                question_number=i,
                response=f"Test response {i}"
            )
        )
    return responses


@pytest.fixture
def test_all_form_responses_in_db(test_db, test_user_in_db) -> List[FormResponse]:
    """Add test form responses for all 25 questions to the database and return them."""
    responses = []
    for i in range(1, 26):
        response = FormResponse(
            user_id=test_user_in_db.id,
            question_number=i,
            response=f"Test response {i}"
        )
        test_db.add(response)
        responses.append(response)
    
    test_db.commit()
    for response in responses:
        test_db.refresh(response)
    
    yield responses
    
    # Clean up after the test
    for response in responses:
        test_db.delete(response)
    test_db.commit()


@pytest.fixture
def test_basic_result(test_user) -> Result:
    """Create a test basic result."""
    return Result(
        user_id=test_user.id,
        basic_plan='{"mantra": "Test mantra", "purpose": "Test purpose"}',
        full_plan="",
        regeneration_count=0
    )


@pytest.fixture
def test_full_result(test_user) -> Result:
    """Create a test full result."""
    basic_plan = '{"mantra": "Test mantra", "purpose": "Test purpose"}'
    full_plan = '{"mantra": "Test mantra", "purpose": "Test purpose", "next_steps": {"today": [], "next_7_days": [], "next_30_days": [], "next_180_days": []}, "daily_plan": {"weekdays": {"morning": [], "afternoon": [], "evening": []}, "weekends": {"morning": [], "afternoon": [], "evening": []}}, "obstacles": []}'
    
    return Result(
        user_id=test_user.id,
        basic_plan=basic_plan,
        full_plan=full_plan,
        regeneration_count=0
    )


@pytest.fixture
def test_basic_result_in_db(test_db, test_user_in_db) -> Result:
    """Add a test basic result to the database and return it."""
    result = Result(
        user_id=test_user_in_db.id,
        basic_plan='{"mantra": "Test mantra", "purpose": "Test purpose"}',
        full_plan="",
        regeneration_count=0
    )
    test_db.add(result)
    test_db.commit()
    test_db.refresh(result)
    
    yield result
    
    # Clean up after the test
    test_db.delete(result)
    test_db.commit()


@pytest.fixture
def test_full_result_in_db(test_db, test_user_in_db) -> Result:
    """Add a test full result to the database and return it."""
    basic_plan = '{"mantra": "Test mantra", "purpose": "Test purpose"}'
    full_plan = '{"mantra": "Test mantra", "purpose": "Test purpose", "next_steps": {"today": [], "next_7_days": [], "next_30_days": [], "next_180_days": []}, "daily_plan": {"weekdays": {"morning": [], "afternoon": [], "evening": []}, "weekends": {"morning": [], "afternoon": [], "evening": []}}, "obstacles": []}'
    
    result = Result(
        user_id=test_user_in_db.id,
        basic_plan=basic_plan,
        full_plan=full_plan,
        regeneration_count=0
    )
    test_db.add(result)
    test_db.commit()
    test_db.refresh(result)
    
    yield result
    
    # Clean up after the test
    test_db.delete(result)
    test_db.commit()


# Mock fixtures for external services
@pytest.fixture
def mock_stytch_client(mocker: MockerFixture):
    """Mock the Stytch client."""
    mock_client = mocker.patch("clients.get_stytch_client")
    
    # Create a mock client with the necessary methods
    mock_client_instance = mocker.MagicMock()
    mock_client.return_value = mock_client_instance
    
    # Mock the magic links methods
    mock_client_instance.magic_links = mocker.MagicMock()
    mock_client_instance.magic_links.email = mocker.MagicMock()
    mock_client_instance.magic_links.email.login_or_create = mocker.MagicMock()
    mock_client_instance.magic_links.authenticate = mocker.MagicMock()
    
    # Mock the sessions methods
    mock_client_instance.sessions = mocker.MagicMock()
    mock_client_instance.sessions.authenticate = mocker.MagicMock()
    mock_client_instance.sessions.authenticate_jwt = mocker.MagicMock()
    mock_client_instance.sessions.exchange_session_token = mocker.MagicMock()
    
    return mock_client_instance


@pytest.fixture
def mock_stripe(mocker: MockerFixture):
    """Mock the Stripe client."""
    # Mock the stripe module in clients.py
    mock_stripe = mocker.patch("clients.stripe")
    
    # Mock the checkout.Session methods
    mock_stripe.checkout = mocker.MagicMock()
    mock_stripe.checkout.Session = mocker.MagicMock()
    mock_stripe.checkout.Session.create = mocker.MagicMock()
    mock_stripe.checkout.Session.retrieve = mocker.MagicMock()
    
    # Mock the Subscription methods
    mock_stripe.Subscription = mocker.MagicMock()
    mock_stripe.Subscription.create = mocker.MagicMock()
    mock_stripe.Subscription.retrieve = mocker.MagicMock()
    mock_stripe.Subscription.modify = mocker.MagicMock()
    
    # Mock the PaymentIntent methods
    mock_stripe.PaymentIntent = mocker.MagicMock()
    mock_stripe.PaymentIntent.create = mocker.MagicMock()
    mock_stripe.PaymentIntent.retrieve = mocker.MagicMock()
    
    # Mock the Webhook methods
    mock_stripe.Webhook = mocker.MagicMock()
    mock_stripe.Webhook.construct_event = mocker.MagicMock()
    
    # Also patch any direct imports of stripe in payment modules
    mocker.patch("app.routers.payments.payment_checkout.stripe", mock_stripe)
    mocker.patch("app.routers.payments.payment_verification.stripe", mock_stripe)
    mocker.patch("app.routers.payments.payment_webhooks.stripe", mock_stripe)
    mocker.patch("app.routers.payments.subscription_management.stripe", mock_stripe)
    
    return mock_stripe


@pytest.fixture
def mock_langchain_llm(mocker: MockerFixture):
    """Mock the LangChain LLM."""
    # Mock the ChatOpenAI class
    mock_llm = mocker.patch("app.routers.ai.ai_generation.llm")
    
    # Create a mock for the structured output method
    mock_structured_output = mocker.MagicMock()
    mock_llm.with_structured_output.return_value = mock_structured_output
    
    # Create a mock for the invoke method
    mock_structured_output.invoke = mocker.MagicMock()
    
    return mock_llm


@pytest.fixture
def mock_summary_output():
    """Create a mock SummaryOutput."""
    return SummaryOutput(
        mantra="Test mantra for a purposeful life",
        purpose="This is a test purpose summary that provides guidance and direction for the user's life journey."
    )


@pytest.fixture
def mock_full_plan_output():
    """Create a mock FullPlanOutput."""
    return FullPlanOutput(
        mantra="Test mantra for a purposeful life",
        purpose="This is a test purpose summary that provides guidance and direction for the user's life journey.",
        next_steps={
            "today": [
                {"text": "Reflect on your values", "category": "reflection"},
                {"text": "Write down your goals", "category": "planning"}
            ],
            "next_7_days": [
                {"text": "Start a daily meditation practice", "category": "mindfulness"},
                {"text": "Connect with a mentor", "category": "social"}
            ],
            "next_30_days": [
                {"text": "Take a course related to your interests", "category": "learning"},
                {"text": "Establish a regular exercise routine", "category": "health"}
            ],
            "next_180_days": [
                {"text": "Plan a trip to explore new perspectives", "category": "travel"},
                {"text": "Start a meaningful project", "category": "creativity"}
            ]
        },
        daily_plan={
            "weekdays": {
                "morning": [
                    {"text": "Meditate for 10 minutes", "category": "mindfulness"},
                    {"text": "Review your goals", "category": "planning"}
                ],
                "afternoon": [
                    {"text": "Take a short walk", "category": "health"},
                    {"text": "Learn something new", "category": "learning"}
                ],
                "evening": [
                    {"text": "Reflect on the day", "category": "reflection"},
                    {"text": "Practice gratitude", "category": "gratitude"}
                ]
            },
            "weekends": {
                "morning": [
                    {"text": "Extended meditation session", "category": "mindfulness"},
                    {"text": "Enjoy a nutritious breakfast", "category": "nutrition"}
                ],
                "afternoon": [
                    {"text": "Spend time in nature", "category": "nature"},
                    {"text": "Connect with friends or family", "category": "social"}
                ],
                "evening": [
                    {"text": "Engage in a creative activity", "category": "creativity"},
                    {"text": "Plan for the week ahead", "category": "planning"}
                ]
            }
        },
        obstacles=[
            {
                "challenge": "Self-doubt and fear of failure",
                "solution": "Practice self-compassion and remember that failure is part of growth",
                "type": "personal"
            },
            {
                "challenge": "Time management and competing priorities",
                "solution": "Create a structured schedule and learn to set boundaries",
                "type": "personal"
            },
            {
                "challenge": "External expectations and societal pressure",
                "solution": "Stay focused on your authentic path and values",
                "type": "external"
            }
        ]
    )


@pytest.fixture
def mock_authenticated_user(mocker: MockerFixture):
    """Mock the authenticated user."""
    # Create a mock user object
    mock_user = mocker.MagicMock()
    mock_user.user_id = str(uuid.uuid4())
    mock_user.emails = [mocker.MagicMock(email="test@example.com")]
    
    # Mock the get_authenticated_user function
    mocker.patch("app.routers.auth.get_authenticated_user", return_value=mock_user)
    
    return mock_user


@pytest.fixture
def mock_zodiac_info():
    """Create mock zodiac information."""
    return {
        "sign": "Libra",
        "element": "Air",
        "traits": "Balanced, fair, social, diplomatic, gracious"
    }


def create_mock_stytch_error(message, status_code, error_type, error_message, request_id):
    """
    Create a properly structured mock StytchError.
    
    This helper function ensures consistent creation of StytchError objects
    with all required attributes properly set.
    """
    from stytch.core.response_base import StytchError
    
    # Create the error object
    try:
        # Try the constructor with all parameters
        mock_error = StytchError(
            message=message,
            status_code=status_code,
            error_type=error_type,
            error_message=error_message,
            request_id=request_id
        )
    except TypeError:
        # If that fails, try with just the message
        mock_error = StytchError(message)
        # Set attributes manually
        mock_error.status_code = status_code
        mock_error.error_type = error_type
        mock_error.error_message = error_message
        mock_error.request_id = request_id
    
    # Add details attribute with original_json
    from unittest.mock import MagicMock
    mock_error.details = MagicMock()
    mock_error.details.original_json = {"error": error_message}
    
    return mock_error
