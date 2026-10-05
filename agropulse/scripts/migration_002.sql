-- AgroPulse Africa — Migration 002 : alignement schema Neon sur les modeles SQLAlchemy.
-- A executer UNE fois dans Neon Dashboard → SQL Editor → Run (apres seed_neon.sql).
-- Idempotent : que des IF NOT EXISTS. Ne touche pas aux donnees.

-- ---------- 1. Colonnes manquantes sur tables existantes ----------
ALTER TABLE countries ADD COLUMN IF NOT EXISTS code VARCHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'XOF';
ALTER TABLE countries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE regions ADD COLUMN IF NOT EXISTS country_id UUID;
ALTER TABLE regions ADD COLUMN IF NOT EXISTS code VARCHAR(10);
ALTER TABLE regions ADD COLUMN IF NOT EXISTS name_local VARCHAR(100);

ALTER TABLE markets ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS name_local VARCHAR(150);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS lng NUMERIC(9,5);
ALTER TABLE markets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_local VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE price_records ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'XOF';
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS volume_estimate DECIMAL(12,2);
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill code produit (le seed initial ne l'avait pas) puis contrainte utile
UPDATE products SET code = UPPER(name_fr) WHERE code IS NULL;
UPDATE price_records SET recorded_at = NOW() WHERE recorded_at IS NULL;

-- ---------- 2. Tables manquantes (endpoints futurs : users, alertes, marketplace) ----------
CREATE TABLE IF NOT EXISTS product_categories (
 id UUID PRIMARY KEY, name_fr VARCHAR(100) NOT NULL, icon VARCHAR(50));
CREATE TABLE IF NOT EXISTS price_validations (
 id UUID PRIMARY KEY, price_record_id UUID NOT NULL, validator_id UUID NOT NULL,
 action VARCHAR(10) NOT NULL, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS price_aggregates (
 id UUID PRIMARY KEY, product_id UUID NOT NULL, market_id UUID NOT NULL,
 avg_price DECIMAL(12,2) NOT NULL, min_price DECIMAL(12,2), max_price DECIMAL(12,2),
 median_price DECIMAL(12,2), sample_count INTEGER DEFAULT 1, variation_24h DECIMAL(5,2),
 period_start TIMESTAMPTZ, period_end TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY, phone VARCHAR(20) UNIQUE, email VARCHAR(255), full_name VARCHAR(200),
 role VARCHAR(20) DEFAULT 'farmer', language VARCHAR(5) DEFAULT 'fr', region_id UUID,
 whatsapp_id VARCHAR(50), reliability_score DECIMAL(3,2) DEFAULT 3.00,
 is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS subscriptions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, plan VARCHAR(20) NOT NULL,
 status VARCHAR(20) DEFAULT 'active', starts_at TIMESTAMPTZ DEFAULT NOW(),
 ends_at TIMESTAMPTZ, payment_method VARCHAR(20), amount DECIMAL(10,2),
 currency VARCHAR(3) DEFAULT 'XOF');
CREATE TABLE IF NOT EXISTS alerts (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, product_id UUID NOT NULL, market_id UUID,
 alert_type VARCHAR(20) NOT NULL, threshold_value DECIMAL(12,2),
 is_active BOOLEAN DEFAULT TRUE, last_triggered TIMESTAMPTZ,
 channel VARCHAR(20) DEFAULT 'whatsapp', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS notifications (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, alert_id UUID, message TEXT NOT NULL,
 channel VARCHAR(20) NOT NULL, status VARCHAR(20) DEFAULT 'sent',
 sent_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS field_agents (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, quality_score DECIMAL(3,2) DEFAULT 3.00,
 total_submissions INTEGER DEFAULT 0, approval_rate DECIMAL(5,2),
 is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS price_forecasts (
 id UUID PRIMARY KEY, product_id UUID NOT NULL, market_id UUID NOT NULL,
 forecast_date DATE NOT NULL, predicted_price DECIMAL(12,2) NOT NULL,
 confidence_low DECIMAL(12,2), confidence_high DECIMAL(12,2), model_version VARCHAR(20));
CREATE TABLE IF NOT EXISTS marketplace_listings (
 id UUID PRIMARY KEY, seller_id UUID NOT NULL, product_id UUID NOT NULL, region_id UUID NOT NULL,
 quantity DECIMAL(12,2) NOT NULL, unit VARCHAR(20) DEFAULT 'kg',
 price_per_unit DECIMAL(12,2) NOT NULL, currency VARCHAR(3) DEFAULT 'XOF',
 description TEXT, status VARCHAR(20) DEFAULT 'active',
 created_at TIMESTAMPTZ DEFAULT NOW());
