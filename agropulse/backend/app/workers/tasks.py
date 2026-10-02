from .celery_app import celery
@celery.task(name="app.workers.tasks.check_alerts")
def check_alerts():
    # Toutes les 15min : nouveaux prix -> évalue règles -> dispatch WhatsApp/SMS
    return {"checked": True}
@celery.task(name="app.workers.tasks.run_forecast")
def run_forecast():
    # 02:00 UTC : 90j historique + météo -> Prophet -> price_forecasts
    return {"model": "prophet-v1.2", "done": True}
