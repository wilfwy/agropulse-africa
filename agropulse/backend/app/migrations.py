"""Auto-migration legere au demarrage : garantit que les colonnes critiques existent.

Ne remplace pas Alembic (Phase 2) mais evite qu'un deploiement casse sur un
schéma incomplet. Toutes les requetes sont IF NOT EXISTS -> idempotentes.
"""
import logging

from app.database import engine
from sqlalchemy import text

log = logging.getLogger("agropulse.schema")

STATEMENTS = [
    "ALTER TABLE countries ADD COLUMN IF NOT EXISTS code VARCHAR(3)",
    "ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'XOF'",
    "ALTER TABLE regions ADD COLUMN IF NOT EXISTS country_id UUID",
    "ALTER TABLE regions ADD COLUMN IF NOT EXISTS code VARCHAR(10)",
    "ALTER TABLE markets ADD COLUMN IF NOT EXISTS region_id UUID",
    "ALTER TABLE markets ADD COLUMN IF NOT EXISTS name_local VARCHAR(150)",
    "ALTER TABLE markets ADD COLUMN IF NOT EXISTS lng NUMERIC(9,5)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(20)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS name_local VARCHAR(100)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS product_id UUID",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'XOF'",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS volume_estimate DECIMAL(12,2)",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS source_id UUID",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)",
    "ALTER TABLE price_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_id VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) DEFAULT 3.00",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20)",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ",
    "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp'",
    "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS last_triggered TIMESTAMPTZ",
    "UPDATE products SET code = UPPER(name_fr) WHERE code IS NULL",
    "UPDATE price_records SET recorded_at = NOW() WHERE recorded_at IS NULL",
]


def ensure_schema() -> dict:
    """Applique les ALTER TABLE IF NOT EXISTS. Retourne un rapport."""
    applied, skipped = [], []
    try:
        with engine.begin() as conn:
            for stmt in STATEMENTS:
                try:
                    conn.execute(text(stmt))
                    applied.append(stmt.split(" IF NOT EXISTS ")[-1][:60])
                except Exception as exc:
                    skipped.append(f"{stmt[:50]} -> {exc}")
    except Exception as exc:
        log.warning("Schema non accessible: %s", exc)
        return {"ok": False, "error": str(exc)}
    if applied:
        log.info("Schema mis a jour: %d statements", len(applied))
    return {"ok": True, "applied": len(applied), "skipped": len(skipped)}
