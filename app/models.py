from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

Base = declarative_base()


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    system_prompts = relationship("SystemPrompt", back_populates="tenant", uselist=False)
    kb_items = relationship("KBItem", back_populates="tenant")
    orders = relationship("Order", back_populates="tenant")


class SystemPrompt(Base):
    __tablename__ = "system_prompts"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True)
    prompt_text = Column(Text, default="You are a helpful restaurant assistant.")

    tenant = relationship("Tenant", back_populates="system_prompts")


class KBItem(Base):
    __tablename__ = "kb_items"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), default="general")
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="kb_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    customer_name = Column(String(255), nullable=False)
    customer_address = Column(Text, nullable=False)
    customer_phone = Column(String(50), nullable=False)
    order_items = Column(Text, nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="orders")


# Create tables
engine = create_engine("sqlite:///./restaurant_chatbot.db")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
