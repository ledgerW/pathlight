# System Patterns

## Architecture Overview
The application follows a modern web application architecture with:

1. **Backend**
   - FastAPI framework (Python)
   - Routed API endpoints
   - SQLModel database models and persistence
   - Authentication system
   - Payment system
   - AI integration

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
1. User submits data through forms
2. Backend processes the submission
3. Data is stored in the database
4. AI processing may be applied
5. Results are generated and stored
6. Results are presented to the user

## Authentication Flow
1. User registers or logs via emailed magic link
2. Authentication tokens are generated
3. Tokens are used to authenticate API requests
4. User permissions determine access to features

## Payment Processing
1. User selects a payment tier
2. Payment information is collected
3. Payment is processed through a payment gateway
4. User account is updated with new access level
5. Premium features are unlocked

## Database Migrations
The presence of migration scripts suggests an evolving database schema with controlled updates.

## Key Implementation Paths
- Form submission → Processing → Results display
- User registration → Authentication → Authorized access
- Payment initiation → Processing → Feature access

This document will be updated as more information about the system architecture and patterns becomes available.
