import uuid
from sqlalchemy import Column, String, Boolean, Numeric, Integer, DateTime, ForeignKey, Text, Date, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

def uuid_col():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

class Country(Base):
    __tablename__ = "countries"
    id = uuid_col()
    code = Column(String(3), unique=True, nullable=False)
    name_fr = Column(String(100), nullable=False)
    currency = Column(String(3), default="XOF")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Region(Base):
    __tablename__ = "regions"
    id = uuid_col()
    country_id = Column(UUID(as_uuid=True), ForeignKey("countries.id"), nullable=False)
    code = Column(String(10), nullable=False)
    name_fr = Column(String(100), nullable=False)
    name_local = Column(String(100))

class Market(Base):
    __tablename__ = "markets"
    id = uuid_col()
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id"), nullable=False)
    name_fr = Column(String(150), nullable=False)
    name_local = Column(String(150))
    market_type = Column(String(20), default="wholesale")
    lat = Column(Numeric(9,5))
    lng = Column(Numeric(9,5))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = uuid_col()
    name_fr = Column(String(100), nullable=False)
    icon = Column(String(50))

class Product(Base):
    __tablename__ = "products"
    id = uuid_col()
    category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id"))
    code = Column(String(20), unique=True, nullable=False)
    name_fr = Column(String(100), nullable=False)
    name_local = Column(String(100))
    unit = Column(String(20), default="kg")
    is_active = Column(Boolean, default=True)

class PriceRecord(Base):
    __tablename__ = "price_records"
    id = uuid_col()
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    market_id = Column(UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False)
    price = Column(Numeric(12,2), nullable=False)
    currency = Column(String(3), default="XOF")
    unit = Column(String(20), default="kg")
    volume_estimate = Column(Numeric(12,2))
    source_type = Column(String(20), nullable=False)
    source_id = Column(UUID(as_uuid=True))
    photo_url = Column(String(500))
    status = Column(String(20), default="pending")
    recorded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PriceValidation(Base):
    __tablename__ = "price_validations"
    id = uuid_col()
    price_record_id = Column(UUID(as_uuid=True), ForeignKey("price_records.id"), nullable=False)
    validator_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(10), nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PriceAggregate(Base):
    __tablename__ = "price_aggregates"
    id = uuid_col()
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    market_id = Column(UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False)
    avg_price = Column(Numeric(12,2), nullable=False)
    min_price = Column(Numeric(12,2))
    max_price = Column(Numeric(12,2))
    median_price = Column(Numeric(12,2))
    sample_count = Column(Integer, nullable=False, default=1)
    variation_24h = Column(Numeric(5,2))
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

class User(Base):
    __tablename__ = "users"
    id = uuid_col()
    phone = Column(String(20), unique=True, nullable=False)
    email = Column(String(255))
    full_name = Column(String(200))
    role = Column(String(20), default="farmer")
    language = Column(String(5), default="fr")
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id"))
    whatsapp_id = Column(String(50))
    reliability_score = Column(Numeric(3,2), default=3.00)
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = uuid_col()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan = Column(String(20), nullable=False)
    status = Column(String(20), default="active")
    starts_at = Column(DateTime(timezone=True), server_default=func.now())
    ends_at = Column(DateTime(timezone=True))
    payment_method = Column(String(20))
    amount = Column(Numeric(10,2))
    currency = Column(String(3), default="XOF")

class Alert(Base):
    __tablename__ = "alerts"
    id = uuid_col()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    market_id = Column(UUID(as_uuid=True), ForeignKey("markets.id"))
    alert_type = Column(String(20), nullable=False)
    threshold_value = Column(Numeric(12,2))
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime(timezone=True))
    channel = Column(String(20), default="whatsapp")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = uuid_col()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    alert_id = Column(UUID(as_uuid=True), ForeignKey("alerts.id"))
    message = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False)
    status = Column(String(20), default="sent")
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

class FieldAgent(Base):
    __tablename__ = "field_agents"
    id = uuid_col()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quality_score = Column(Numeric(3,2), default=3.00)
    total_submissions = Column(Integer, default=0)
    approval_rate = Column(Numeric(5,2))
    is_active = Column(Boolean, default=True)

class PriceForecast(Base):
    __tablename__ = "price_forecasts"
    id = uuid_col()
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    market_id = Column(UUID(as_uuid=True), ForeignKey("markets.id"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    predicted_price = Column(Numeric(12,2), nullable=False)
    confidence_low = Column(Numeric(12,2))
    confidence_high = Column(Numeric(12,2))
    model_version = Column(String(20))

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"
    id = uuid_col()
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    region_id = Column(UUID(as_uuid=True), ForeignKey("regions.id"), nullable=False)
    quantity = Column(Numeric(12,2), nullable=False)
    unit = Column(String(20), default="kg")
    price_per_unit = Column(Numeric(12,2), nullable=False)
    currency = Column(String(3), default="XOF")
    description = Column(Text)
    status = Column(String(20), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
