# Pathlight Testing Suite

This directory contains the testing suite for the Pathlight application. The tests are organized into unit tests to ensure comprehensive coverage of the application's functionality.

## Testing Structure

```
tests/
├── conftest.py                  # Shared fixtures and test configuration
├── unit/                        # Unit tests for individual components
│   ├── models/                  # Tests for database models
│   │   ├── test_user_model.py
│   │   ├── test_form_response_model.py
│   │   └── test_result_model.py
│   └── routers/                 # Tests for API endpoints
│       ├── auth/                # Authentication tests
│       │   ├── test_login.py
│       │   └── test_session.py
│       ├── payments/            # Payment processing tests
│       │   ├── test_checkout.py
│       │   ├── test_verification.py
│       │   ├── test_subscription_management.py
│       │   └── test_webhooks.py
│       └── ai/                  # AI generation tests
│           └── test_generation.py
```

## Testing Approach

### Unit Tests

Unit tests focus on testing individual components in isolation. External dependencies like databases, Stripe, Stytch, and LangChain/OpenAI are mocked to ensure tests are fast, reliable, and don't depend on external services.

Key areas covered by unit tests:

1. **Database Models**: CRUD operations and relationships for User, FormResponse, and Result models.
2. **Authentication**: Login, session management, and token handling.
3. **Payment Processing**: Checkout session creation, payment verification, subscription management, and webhook handling.
4. **AI Generation**: Purpose and plan generation using LangChain/OpenAI.

### Integration Tests

Integration tests simulate complete user journeys through the application, testing how different components work together. These tests cover the three payment tiers:

1. **Purpose Tier ($0.99)**: Basic plan with the first 5 questions.
2. **Plan Tier ($4.99)**: Full plan with all 25 questions.
3. **Pursuit Tier ($4.99/month)**: Subscription with regeneration capability and subscription management.

Each integration test follows a user from registration through form submission, payment, and results generation, ensuring the complete flow works correctly.

## Mock Strategy

The tests use a comprehensive mocking strategy to isolate the application from external dependencies:

1. **Database**: Uses an in-memory SQLite database for testing.
2. **Stripe API**: Mocks all Stripe API calls for payment processing and subscription management.
3. **Stytch API**: Mocks authentication and session management.
4. **LangChain/OpenAI**: Mocks AI model calls with predefined responses.

## Running the Tests

### Prerequisites

Make sure you have all the required dependencies installed:

```bash
poetry install --with dev
```

### Running All Tests

To run all tests:

```bash
poetry run pytest
```

### Running Specific Test Categories

To run only unit tests:

```bash
poetry run pytest tests/unit/
```

To run tests for a specific component:

```bash
poetry run pytest tests/unit/models/
poetry run pytest tests/unit/routers/auth/
poetry run pytest tests/unit/routers/payments/
poetry run pytest tests/unit/routers/ai/
```

### Running a Specific Test File

```bash
poetry run pytest tests/unit/models/test_user_model.py
```

### Running with Verbose Output

```bash
poetry run pytest -v
```

## Test Database

The tests use an in-memory SQLite database that is created and destroyed for each test. This ensures test isolation and prevents test data from persisting between test runs.

The database fixtures in `conftest.py` handle:

1. Creating the test database
2. Creating test data
3. Cleaning up after tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.
2. **Clean Up**: Always clean up test data after tests to prevent test pollution.
3. **Mock External Services**: Never make real API calls to external services in tests.
4. **Comprehensive Coverage**: Aim to test both happy paths and error cases.
5. **Descriptive Names**: Use descriptive test names that explain what is being tested.
