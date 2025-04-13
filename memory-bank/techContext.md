# Technical Context

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQL database (specific type to be determined, likely PostgreSQL or SQLite)
- **ORM**: SQLModel (Python)
- **Authentication**: Stytch (Python) with email Magic Links instead of passwords
- **Payment**: Stripe (Python)
- **AI Integration**: Langchain and Langgraph (details in `app/prompts.py` and `app/routers/ai.py`)

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
- Potential external services for:
  - AI processing
  - Payment processing
  - Authentication

## Technical Constraints
- Web-based application architecture
- Database schema evolution managed through migrations
- Separation of concerns through modular code organization

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
- Various migration scripts for database schema evolution

## Development Workflow
- Database migrations for schema changes
- Modular code organization for maintainability
- Separation of frontend and backend concerns

## Security Considerations
- Token-based authentication
- Secure payment processing
- Protection of user data

This document will be updated as more information about the technical aspects becomes available.
