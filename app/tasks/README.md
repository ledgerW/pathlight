# Background Tasks

This directory contains background tasks for the Pathlight application.

## Subscription Cleanup Task

The `subscription_cleanup.py` module handles the automatic expiration of canceled subscriptions.

### What it does

When a user cancels their subscription, they should continue to have access to premium features until the end of their billing period. The `cleanup_expired_subscriptions()` function:

1. Finds users with expired subscriptions (`subscription_end_date < now()`)
2. Downgrades them from "pursuit" to "purpose" tier
3. Clears their subscription data

### Running the task

#### Manual execution (for testing)
```bash
cd /Users/ledger/Desktop/pathlight
poetry run python app/tasks/subscription_cleanup.py
```

#### Production setup

This task should be run daily as a cron job or scheduled task. Here are some options:

**Option 1: Cron job (Linux/macOS)**
```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd /path/to/pathlight && poetry run python app/tasks/subscription_cleanup.py
```

**Option 2: FastAPI Background Tasks**
You can integrate this into your FastAPI application using APScheduler:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.tasks.subscription_cleanup import cleanup_expired_subscriptions

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    # Run daily at 2 AM
    scheduler.add_job(
        cleanup_expired_subscriptions,
        "cron",
        hour=2,
        minute=0
    )
    scheduler.start()
```

**Option 3: Cloud Functions/Lambda**
Deploy the cleanup function as a serverless function that runs on a schedule.

### Monitoring

The task includes logging and returns a status report:

```python
result = cleanup_expired_subscriptions()
print(result)
# Output: {"success": True, "users_downgraded": 3, "message": "Successfully processed 3 expired subscriptions"}
```

You can also check subscription status:

```python
from app.tasks.subscription_cleanup import check_subscription_status
status = check_subscription_status()
print(status)
# Output: {"total_subscriptions": 10, "active": 7, "canceled": 2, "expired": 1, "other": 0}
```

### Error Handling

The task includes comprehensive error handling:
- Database rollback on errors
- Detailed logging of all operations
- Graceful handling of edge cases

### Testing

Run the test suite to verify the subscription logic:

```bash
poetry run python -m pytest tests/unit/routers/payments/test_subscription_fix.py -v
```

This ensures that the premium access logic works correctly for all subscription states.
