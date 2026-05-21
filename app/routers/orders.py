from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models import get_db, Order, Tenant
from app.auth import get_current_tenant

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderCreate(BaseModel):
    customer_name: str
    customer_address: str
    customer_phone: str
    order_items: str  # representing the "order box" content

class OrderUpdateStatus(BaseModel):
    status: str  # pending, accepted, rejected, out_of_stock

class OrderResponse(BaseModel):
    id: int
    tenant_id: int
    customer_name: str
    customer_address: str
    customer_phone: str
    order_items: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=OrderResponse)
async def create_order(
    order_in: OrderCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    db_order = Order(
        tenant_id=tenant.id,
        customer_name=order_in.customer_name,
        customer_address=order_in.customer_address,
        customer_phone=order_in.customer_phone,
        order_items=order_in.order_items,
        status="pending"
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).filter(Order.tenant_id == tenant.id).order_by(Order.created_at.desc()).all()
    return orders

@router.put("/{order_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderUpdateStatus,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    db_order = db.query(Order).filter(
        Order.id == order_id,
        Order.tenant_id == tenant.id
    ).first()
    
    if not db_order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    valid_statuses = ["pending", "accepted", "rejected", "out_of_stock"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of {valid_statuses}"
        )
        
    db_order.status = status_update.status
    db.commit()
    db.refresh(db_order)
    return db_order
