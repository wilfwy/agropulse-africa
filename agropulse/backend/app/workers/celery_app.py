from celery import Celery
import os
celery = Celery("agropulse", broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"))
celery.conf.beat_schedule = {
    "check-alerts-15min": {"task": "app.workers.tasks.check_alerts", "schedule": 900.0},
    "forecast-nightly": {"task": "app.workers.tasks.run_forecast", "schedule": 86400.0},
}
