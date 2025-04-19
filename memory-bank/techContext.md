# Technical Context

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQL database (supports both PostgreSQL in production and SQLite for development)
- **ORM**: SQLModel (Python)
- **Authentication**: Stytch (Python) with email Magic Links instead of passwords
- **Payment**: Stripe (Python) with two tiers ($0.99 for basic, $4.99 for premium)
- **AI Integration**: 
  - Langchain for prompt templates and structured output
  - OpenAI GPT-4o model for generating insights
  - Pydantic models for structured output parsing
  - Astrological sign determination based on birth date

### Frontend
- **Templates**: HTML with Jinja2 templating
- **JavaScript**: Modular JS files organized by functionality
- **CSS**: Modular CSS files for different components
- **Client-Side Routing**: Likely handled through JavaScript

### Development Environment
- **Deployment**: Replit (based on `.replit` file)
- **Package Management**: Poetry (based on `pyproject.toml` and `poetry.lock`)
- **Environment Variables**: Using `.env` file for configuration
- **Production Environment**: Environment variable sREPLIT_DEPLOYMENT == 1

## Dependencies
- Python packages managed through Poetry
- External services:
  - OpenAI API for AI processing
  - Stripe for payment processing
  - Stytch for authentication

## Technical Constraints
- Web-based application architecture
- Database schema evolution managed through migrations
- Separation of concerns through modular code organization
- Structured JSON data for storing AI-generated results
- Support for both PostgreSQL and SQLite databases

## File Organization

### Backend Structure
- `app/`: Main application package
  - `models/`: Database models and connections
  - `routers/`: API endpoints and route handlers
  - `templates/`: HTML templates
  - `static/`: Static assets (JS, CSS, images)
  - `prompts.py`: AI prompt definitions

### Frontend Structure
- `app/static/js/`: JavaScript files
  - Core modules (`*-core.js`)
  - UI handlers (`*-ui.js`)
  - API communication (`*-api.js`)
  - Payment processing (`*-payment.js`)
  - Main orchestration (`*-main.js`)
- `app/static/css/`: CSS stylesheets
- `app/static/images/`: Image assets
- `app/templates/`: HTML templates

### Database Migrations
- Various migration scripts for database schema evolution:
  - `alter_results_table.py`: Migrates from text-based summary to structured JSON basic_plan
  - `alter_results_last_generated.py`: Adds last_generated_at column to track result generation time
  - `db_migration_basic_plan.py`: Related to basic plan implementation

## Development Workflow
- Database migrations for schema changes
- Modular code organization for maintainability
- Separation of frontend and backend concerns

## Security Considerations
- Token-based authentication
- Secure payment processing
- Protection of user data

This document will be updated as more information about the technical aspects becomes available.
