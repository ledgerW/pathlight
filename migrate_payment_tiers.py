#!/usr/bin/env python3
"""
Migration script to update the database schema for the two-tier payment system.
This script:
1. Adds the 'dob' column to the users table
2. Converts 'payment_complete' to 'payment_tier'
"""

import os
import sys
from datetime import datetime
from sqlmodel import Session, select, create_engine
from app.models import User, Result, FormResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use PostgreSQL database
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create engine with PostgreSQL
engine = create_engine(DATABASE_URL)

def migrate_users():
    """
    Migrate users table:
    - Add dob column with a default value
    - Convert payment_complete to payment_tier
    """
    with Session(engine) as session:
        # Get all users
        users = session.exec(select(User)).all()
        
        print(f"Migrating {len(users)} users...")
        
        for user in users:
            # Set default DOB if not present
            if not hasattr(user, 'dob'):
                user.dob = datetime.utcnow()
                print(f"Added default DOB for user {user.id}")
            
            # Convert payment_complete to payment_tier
            if hasattr(user, 'payment_complete'):
                # If payment_complete is True, set payment_tier to 'premium'
                if user.payment_complete:
                    user.payment_tier = 'premium'
                    print(f"Converted user {user.id} to premium tier")
                else:
                    # Check if they have any responses
                    responses = session.exec(
                        select(FormResponse).where(FormResponse.user_id == user.id)
                    ).all()
                    
                    if responses:
                        # If they have responses but haven't paid, set to 'none'
                        user.payment_tier = 'none'
                        print(f"Set user {user.id} to 'none' tier (has responses but no payment)")
                    else:
                        # If no responses, set to 'none'
                        user.payment_tier = 'none'
                        print(f"Set user {user.id} to 'none' tier (no responses)")
                
                # Remove payment_complete attribute if it exists
                if hasattr(user, 'payment_complete'):
                    delattr(user, 'payment_complete')
            
            # Save changes
            session.add(user)
        
        # Commit all changes
        session.commit()
        print("User migration completed successfully")

def main():
    """Main migration function"""
    print("Starting database migration for two-tier payment system...")
    
    try:
        migrate_users()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
