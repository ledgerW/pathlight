#!/usr/bin/env python3
"""
Main migration script to run all database migrations.
This script provides a central entry point for running migrations.
"""

import os
import sys
import importlib.util
import argparse
from pathlib import Path

def import_module_from_file(file_path):
    """Import a module from a file path."""
    module_name = os.path.basename(file_path).replace('.py', '')
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def list_migrations():
    """List all available migrations."""
    migrations_dir = Path(__file__).parent
    
    print("Available migrations:")
    print("\nUser Migrations:")
    for file in sorted(Path(migrations_dir / 'users').glob('*.py')):
        if file.name != '__init__.py' and not file.name.startswith('_'):
            print(f"  - users/{file.name}")
    
    print("\nResults Migrations:")
    for file in sorted(Path(migrations_dir / 'results').glob('*.py')):
        if file.name != '__init__.py' and not file.name.startswith('_'):
            print(f"  - results/{file.name}")
    
    print("\nSubscription Migrations:")
    for file in sorted(Path(migrations_dir / 'subscriptions').glob('*.py')):
        if file.name != '__init__.py' and not file.name.startswith('_'):
            print(f"  - subscriptions/{file.name}")
    
    print("\nGeneral Migrations:")
    for file in sorted(Path(migrations_dir / 'general').glob('*.py')):
        if file.name != '__init__.py' and not file.name.startswith('_'):
            print(f"  - general/{file.name}")

def run_migration(migration_path):
    """Run a specific migration."""
    migrations_dir = Path(__file__).parent
    full_path = migrations_dir / migration_path
    
    if not full_path.exists():
        print(f"Error: Migration file {migration_path} not found")
        return False
    
    try:
        print(f"Running migration: {migration_path}")
        module = import_module_from_file(str(full_path))
        
        # Try to find and call the main function
        if hasattr(module, 'main'):
            module.main()
        elif hasattr(module, 'run_migration'):
            module.run_migration()
        elif hasattr(module, 'migrate_data'):
            module.migrate_data()
        elif hasattr(module, 'alter_table'):
            module.alter_table()
        else:
            print(f"Warning: Could not find a main function in {migration_path}")
            return False
        
        print(f"Migration {migration_path} completed successfully")
        return True
    except Exception as e:
        print(f"Error running migration {migration_path}: {e}")
        return False

def main():
    """Main function to parse arguments and run migrations."""
    parser = argparse.ArgumentParser(description='Run database migrations')
    parser.add_argument('--list', action='store_true', help='List all available migrations')
    parser.add_argument('--run', help='Run a specific migration (e.g., users/db_migration.py)')
    parser.add_argument('--all', action='store_true', help='Run all migrations')
    
    args = parser.parse_args()
    
    if args.list:
        list_migrations()
        return
    
    if args.run:
        success = run_migration(args.run)
        sys.exit(0 if success else 1)
    
    if args.all:
        print("Running all migrations is not yet implemented")
        # TODO: Implement running all migrations in the correct order
        sys.exit(1)
    
    # If no arguments provided, show help
    parser.print_help()

if __name__ == "__main__":
    main()
