# Active Context

## Current Focus
Implementing and refining the database schema and AI integration for the life purpose application. The focus is on supporting the two-tier payment model and improving result generation.

## Recent Changes
- Modified the Results table schema to replace "summary" with a structured "basic_plan" JSON field
- Added "last_generated_at" column to the Results table to track when results were last generated
- Implemented database migration scripts for these schema changes
- Enhanced AI integration with structured output using Pydantic models
- Implemented two-tier result generation (basic after 5 questions, premium after all 25)

## Next Steps
- Refine the user experience for the payment flow
- Enhance the results visualization
- Implement additional error handling and edge cases
- Consider adding result regeneration functionality
- Optimize AI prompt templates for better insights

## Active Decisions
- Using structured JSON data for storing AI-generated results
- Implementing a two-tier payment model (basic: $0.99, premium: $4.99)
- Using database migrations for schema evolution
- Incorporating astrological signs and Stoic philosophy in AI guidance
- Using Pydantic models for structured AI output

## Important Patterns and Preferences
- Modular code organization (separate files for different concerns)
- Clear separation between frontend and backend
- Component-based JavaScript structure
- Database migrations for schema evolution
- Structured AI output with defined schemas

## Learnings and Insights
- The application is an AI-powered life purpose guidance system
- The two-tier payment model allows users to get basic insights before committing to the full experience
- Astrological signs provide personalization without being explicitly mentioned to users
- Stoic philosophy underpins the guidance provided
- Database schema evolution requires careful migration planning

This document will be continuously updated as work progresses and new insights are gained.
