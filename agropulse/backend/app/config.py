from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://agropulse:agropulse@localhost:5432/agropulse"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET: str = "dev-secret-change-me"
    ENVIRONMENT: str = "development"
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    S3_BUCKET: str = "agropulse-data"
    # Acces demonstration (comptes de test sans SMS). Mettre 0 en production reelle.
    DEMO_LOGIN: str = "1"

settings = Settings()
