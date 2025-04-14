import os
import sys
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database credentials from environment variables
db_host = os.getenv("PGHOST")
db_port = os.getenv("PGPORT")
db_name = os.getenv("PGDATABASE")
db_user = os.getenv("PGUSER")
db_password = os.getenv("PGPASSWORD")

def alter_results_table():
    """Add last_generated_at column to results table"""
    try:
        # Connect to the database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_password
        )
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'results' AND column_name = 'last_generated_at'
        """)
        column_exists = cursor.fetchone() is not None
        
        if not column_exists:
            print("Adding last_generated_at column to results table...")
            
            # Add the new column with default value of current timestamp
            cursor.execute("""
                ALTER TABLE results 
                ADD COLUMN last_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            
            # Update existing rows to set last_generated_at equal to created_at
            cursor.execute("""
                UPDATE results 
                SET last_generated_at = created_at
            """)
            
            # Commit the changes
            conn.commit()
            print("Successfully added last_generated_at column to results table")
        else:
            print("last_generated_at column already exists in results table")
        
        # Close the connection
        cursor.close()
        conn.close()
        
        return True
    except Exception as e:
        print(f"Error altering results table: {e}")
        return False

if __name__ == "__main__":
    print("Running migration to add last_generated_at column to results table...")
    success = alter_results_table()
    
    if success:
        print("Migration completed successfully")
        sys.exit(0)
    else:
        print("Migration failed")
        sys.exit(1)
