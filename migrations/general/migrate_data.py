import os
import uuid
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text
from dotenv import load_dotenv
from app.models import User, FormResponse, Result

# Load environment variables
load_dotenv()

# Connect to PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def migrate_data():
    with Session(engine) as session:
        # Check if there's data in the "user" table
        result = session.execute(text("SELECT COUNT(*) FROM \"user\""))
        user_count = result.scalar()
        
        if user_count > 0:
            print(f"Found {user_count} records in the 'user' table. Migrating to 'users' table...")
            
            # Get all users from the "user" table
            users_data = session.execute(text("SELECT id, name, email, progress_state, created_at, updated_at, payment_complete FROM \"user\"")).fetchall()
            
            # Insert users into the "users" table
            for user_data in users_data:
                user_id, name, email, progress_state, created_at, updated_at, payment_complete = user_data
                
                # Check if user already exists in the "users" table
                existing_user = session.execute(select(User).where(User.id == user_id)).first()
                
                if not existing_user:
                    # Create new user
                    new_user = User(
                        id=user_id,
                        name=name,
                        email=email,
                        progress_state=progress_state,
                        created_at=created_at,
                        updated_at=updated_at,
                        payment_complete=payment_complete
                    )
                    session.add(new_user)
                    print(f"Migrated user: {name} ({email})")
            
            session.commit()
        else:
            print("No data found in the 'user' table.")
        
        # Check if there's data in the "formresponse" table
        result = session.execute(text("SELECT COUNT(*) FROM \"formresponse\""))
        formresponse_count = result.scalar()
        
        if formresponse_count > 0:
            print(f"Found {formresponse_count} records in the 'formresponse' table. Migrating to 'form_responses' table...")
            
            # Get all form responses from the "formresponse" table
            responses_data = session.execute(text("SELECT id, user_id, question_number, response, created_at FROM \"formresponse\"")).fetchall()
            
            # Insert form responses into the "form_responses" table
            for response_data in responses_data:
                response_id, user_id, question_number, response, created_at = response_data
                
                # Check if response already exists in the "form_responses" table
                existing_response = session.execute(select(FormResponse).where(FormResponse.id == response_id)).first()
                
                if not existing_response:
                    # Create new form response
                    new_response = FormResponse(
                        id=response_id,
                        user_id=user_id,
                        question_number=question_number,
                        response=response,
                        created_at=created_at
                    )
                    session.add(new_response)
                    print(f"Migrated form response: Question {question_number} for user {user_id}")
            
            session.commit()
        else:
            print("No data found in the 'formresponse' table.")
        
        # Check if there's data in the "result" table
        result = session.execute(text("SELECT COUNT(*) FROM \"result\""))
        result_count = result.scalar()
        
        if result_count > 0:
            print(f"Found {result_count} records in the 'result' table. Migrating to 'results' table...")
            
            # Get all results from the "result" table
            results_data = session.execute(text("SELECT id, user_id, summary, full_plan, created_at FROM \"result\"")).fetchall()
            
            # Insert results into the "results" table
            for result_data in results_data:
                result_id, user_id, summary, full_plan, created_at = result_data
                
                # Check if result already exists in the "results" table
                existing_result = session.execute(select(Result).where(Result.id == result_id)).first()
                
                if not existing_result:
                    # Create new result
                    new_result = Result(
                        id=result_id,
                        user_id=user_id,
                        summary=summary,
                        full_plan=full_plan,
                        created_at=created_at
                    )
                    session.add(new_result)
                    print(f"Migrated result for user {user_id}")
            
            session.commit()
        else:
            print("No data found in the 'result' table.")
        
        print("Migration completed successfully!")

def drop_duplicate_tables():
    with Session(engine) as session:
        print("Dropping duplicate tables...")
        
        # Drop the singular-named tables with CASCADE to handle dependencies
        session.execute(text("DROP TABLE IF EXISTS \"formresponse\" CASCADE"))
        session.execute(text("DROP TABLE IF EXISTS \"result\" CASCADE"))
        session.execute(text("DROP TABLE IF EXISTS \"user\" CASCADE"))
        
        print("Duplicate tables dropped successfully!")

if __name__ == "__main__":
    # Only drop the duplicate tables
    drop_duplicate_tables()
