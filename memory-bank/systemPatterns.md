# System Patterns

## Architecture Overview
The application follows a modern web application architecture with:

1. **Backend**
   - FastAPI framework (Python)
   - Routed API endpoints
   - SQLModel database models and persistence
   - Authentication system (Stytch with email Magic Links)
   - Payment system (Stripe)
   - AI integration (Langchain with OpenAI GPT-4o)

2. **Frontend**
   - HTML templates (likely using Jinja2 with FastAPI)
   - JavaScript modules for client-side functionality
   - CSS for styling
   - Modular JS organization (core, UI, API, etc.)

## Design Patterns

### Backend Patterns
- **Router Pattern**: Separate router modules for different functionality areas (auth, users, form_responses, results, payments, ai)
- **Model-View-Controller (MVC)**: 
  - Models in `app/models/`
  - Views in `app/templates/`
  - Controllers in `app/routers/`
- **Database Abstraction**: Models defined separately from database connection

### Frontend Patterns
- **Component-Based Structure**: Separate JS files for different components (form, results)
- **Modular JavaScript**: Files are organized by functionality:
  - Core logic (`*-core.js`)
  - UI handling (`*-ui.js`)
  - API communication (`*-api.js`)
  - Payment processing (`*-payment.js`)
  - Main orchestration (`*-main.js`)
- **Template Inheritance**: Likely using a base template (`base.html`) for common elements

## Data Flow
1. User submits data through forms (25 questions total)
2. Backend processes the submission
3. Data is stored in the database (FormResponse model)
4. After 5 questions and basic payment, AI generates basic results
5. After all 25 questions and premium payment, AI generates full results
6. Results are stored in structured JSON format
7. Results are presented to the user with appropriate visualizations

## Authentication Flow
1. User registers or logs in via emailed magic link (Stytch)
2. Authentication tokens are generated
3. Tokens are used to authenticate API requests
4. User permissions determine access to features based on payment tier

## Payment Processing
1. User selects a payment tier (basic: $0.99, premium: $4.99)
2. Payment information is collected through Stripe
3. Payment is processed
4. User account is updated with new payment tier (none → basic → premium)
5. Corresponding features are unlocked (basic results or full premium results)

## Database Migrations
The application uses migration scripts to evolve the database schema:
- `alter_results_table.py`: Migrates from text-based summary to structured JSON basic_plan
- `alter_results_last_generated.py`: Adds last_generated_at column to track result generation time
- Other migration scripts handle various schema changes

## AI Integration
1. User form responses are collected and formatted
2. User's astrological sign is determined from date of birth
3. Prompt templates incorporate user data and astrological information
4. LLM (GPT-4o) generates structured output using Pydantic models:
   - SummaryOutput: For basic plan (purpose and mantra)
   - FullPlanOutput: For premium plan (analysis, life purposes, next steps, daily plan, obstacles)
5. Results are stored as JSON in the database
6. Frontend displays results in appropriate format

## Key Implementation Paths
- Form submission (5 questions) → Basic payment → Basic results generation → Basic results display
- Form submission (all 25 questions) → Premium payment → Full results generation → Full results display
- User registration → Authentication → Form access
- Payment initiation → Processing → Tier upgrade → Feature access

This document will be updated as more information about the system architecture and patterns becomes available.
