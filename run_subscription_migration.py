#!/usr/bin/env python3
"""
Script to run the subscription migration.
"""

import os
import sys
import subprocess

def main():
    """Run the subscription migration script."""
    print("Running subscription migration...")
    
    try:
        # Check if we're using Poetry
        if os.path.exists("pyproject.toml"):
            # Run with Poetry
            result = subprocess.run(
                ["poetry", "run", "python", "migrate_subscription.py"],
                check=True,
                capture_output=True,
                text=True
            )
        else:
            # Run directly with Python
            result = subprocess.run(
                ["python", "migrate_subscription.py"],
                check=True,
                capture_output=True,
                text=True
            )
        
        # Print the output
        print(result.stdout)
        
        if result.stderr:
            print("Errors:", result.stderr)
        
        print("Subscription migration completed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f"Error running migration: {e}")
        if e.stdout:
            print("Output:", e.stdout)
        if e.stderr:
            print("Errors:", e.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
