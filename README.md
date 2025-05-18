# 🔮 Pathlight

📱 An AI-powered life purpose discovery tool that provides personalized guidance based on user responses to reflective questions.

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-green.svg)](https://fastapi.tiangolo.com/)
[![SQLModel](https://img.shields.io/badge/SQLModel-0.0.8+-orange.svg)](https://sqlmodel.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Overview

Pathlight is a web application that helps users discover their life purpose through a series of 25 carefully crafted reflective questions. Using advanced AI capabilities, the application generates personalized insights and practical guidance tailored to each user's unique responses.

The application follows a three-tier payment model:
- **Purpose Tier** ($0.99): Basic insights after answering the first 5 questions
- **Plan Tier** ($4.99): Comprehensive guidance after answering all 25 questions
- **Pursuit Tier** ($4.99/month): Subscription with unlimited plan regenerations and premium features

## 🏗️ Architecture

```mermaid
graph TD
    User[User] --> |Interacts with| Frontend[Frontend]
    Frontend --> |Sends requests to| Backend[Backend]
    Backend --> |Authenticates via| Auth[Stytch Auth]
    Backend --> |Processes payments via| Payment[Stripe Payment]
    Backend --> |Generates insights via| AI[OpenAI GPT-4o]
    Backend --> |Stores/retrieves data from| DB[(Database)]
    
    subgraph Frontend Components
        Frontend --> HTML[HTML Templates]
        Frontend --> CSS[CSS Styles]
        Frontend --> JS[JavaScript Modules]
    end
    
    subgraph Backend Components
        Backend --> FastAPI[FastAPI Framework]
        Backend --> Routers[API Routers]
        Backend --> Models[SQLModel Models]
        Backend --> Prompts[AI Prompts]
    end
```

### Technology Stack

| Component | Technologies |
|-----------|-------------|
| Backend | FastAPI, SQLModel, Python |
| Database | PostgreSQL (production), SQLite (development) |
| Authentication | Stytch with Magic Links |
| Payment | Stripe |
| AI | Langchain, OpenAI GPT-4o |
| Frontend | HTML, CSS, JavaScript |
| Deployment | Replit |
| Package Management | Poetry |

## ✨ Features

- ⚡ **AI-Powered Insights**: Personalized life purpose guidance using advanced AI
- 🔒 **Secure Authentication**: Email magic link authentication (no passwords)
- 📝 **Reflective Questionnaire**: 25 carefully crafted questions to explore purpose
- 💳 **Flexible Payment Options**: Three-tier model with subscription option
- 🔄 **Plan Regeneration**: Update your plan as your responses evolve
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 📊 **Structured Results**: Clear visualization of insights with sections and timelines
- 📚 **Content Marketing**: Blog posts, guides, and FAQ for deeper exploration

## 🚀 Getting Started

### 📋 Prerequisites

- Python 3.9+
- Poetry (Python package manager)
- PostgreSQL (for production) or SQLite (for development)
- Stytch API credentials
- Stripe API credentials
- OpenAI API credentials

### 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pathlight.git
cd pathlight
```

2. Install dependencies using Poetry:
```bash
poetry install
```

3. Create a `.env` file with your configuration:
```
DATABASE_URL=postgresql://user:password@localhost/pathlight
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STYTCH_PROJECT_ID=your_stytch_project_id
STYTCH_SECRET=your_stytch_secret
```

4. Run database migrations:
```bash
poetry run python migrations/run_all_migrations.py
```

5. Start the application:
```bash
poetry run python main.py
```

## 📖 Usage

### User Journey

```mermaid
flowchart TD
    A[User visits landing page] --> B[User creates account]
    B --> C[User answers first 5 questions]
    C --> D[User pays $0.99 for Purpose tier]
    D --> E[User receives basic results]
    E --> F[User answers remaining 20 questions]
    F --> G{Payment tier?}
    G -->|Plan tier| H[User pays $4.99 one-time]
    G -->|Pursuit tier| I[User subscribes for $4.99/month]
    H --> J[User receives full plan]
    I --> K[User receives full plan with regeneration]
    K --> L[User can update responses and regenerate plan]
```

### Key Interfaces

The application consists of several key interfaces:

1. **Landing Page**: Introduction to Pathlight
2. **Form Interface**: 25 questions with progress tracking
3. **Payment Interface**: Tier selection and payment processing
4. **Results Interface**: Visualization of personalized insights
5. **Account Management**: User profile and subscription management

## 🧪 Testing

The application includes a comprehensive testing suite covering unit tests for all components.

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run specific test categories
poetry run pytest tests/unit/models/
poetry run pytest tests/unit/routers/auth/
poetry run pytest tests/unit/routers/payments/
poetry run pytest tests/unit/routers/ai/
```

<details>
<summary>🔍 Testing Approach Details</summary>

### Testing Strategy

The tests use a comprehensive mocking strategy to isolate the application from external dependencies:

1. **Database**: Uses an in-memory SQLite database for testing
2. **Stripe API**: Mocks all Stripe API calls for payment processing
3. **Stytch API**: Mocks authentication and session management
4. **LangChain/OpenAI**: Mocks AI model calls with predefined responses

### Test Categories

- **Model Tests**: CRUD operations for User, FormResponse, and Result models
- **Auth Tests**: Login, session management, and token handling
- **Payment Tests**: Checkout, verification, webhooks, and subscription management
- **AI Tests**: Purpose and plan generation using LangChain/OpenAI

</details>

## 🔄 Development Workflow

1. Make changes to the codebase
2. Run tests to ensure functionality
3. Create database migrations if schema changes are needed
4. Update documentation as necessary
5. Deploy to production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📋 Project Status

The application is functional with core features implemented. Recent work has focused on:
- Implementing a subscription payment model
- Creating a content marketing strategy
- Fixing authentication flow issues
- Improving mobile responsiveness

### Known Issues

- Plan and Pursuit tier account creation flow has issues with questions not appearing after tier selection
- Some integration tests are failing due to user registration issues and datetime serialization

### Future Plans

- Create additional content for blog, guides, and FAQ sections
- Replace placeholder tracking IDs with actual analytics account IDs
- Fix the Plan and Pursuit tier account creation flow
- Improve subscription management error handling
- Continue improving mobile responsiveness
- Optimize AI prompts for better results
- Add export functionality for the plan (PDF, email, etc.)
- Implement progress tracking for completed plan items
