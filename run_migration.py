#!/usr/bin/env python3
"""
Script to run the database migration to update the results table structure.
This script:
1. Adds the new basic_plan column
2. Migrates data from summary to basic_plan
3. Drops the summary column
"""

from alter_results_table import alter_table

if __name__ == "__main__":
    print("Starting database migration...")
    print("This will modify the results table to replace the 'summary' field with 'basic_plan'")
    print("Make sure you have a backup of your database before proceeding.")
    
    # Ask for confirmation
    confirm = input("Do you want to proceed? (y/n): ")
    
    if confirm.lower() == 'y':
        try:
            # Run the migration
            alter_table()
            print("Migration completed successfully!")
            print("The results table now has a 'basic_plan' field instead of 'summary'.")
        except Exception as e:
            print(f"Migration failed: {str(e)}")
            print("Please restore your database from backup if needed.")
    else:
        print("Migration cancelled.")
