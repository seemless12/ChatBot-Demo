from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import re
from app.models import get_db, Tenant

router = APIRouter(prefix="/tenants", tags=["tenants"])

class TenantCreate(BaseModel):
    name: str
    api_key: Optional[str] = None

class TenantResponse(BaseModel):
    id: int
    name: str
    api_key: str

    class Config:
        from_attributes = True

@router.post("/", response_model=TenantResponse)
async def create_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db)):
    # Check if name is already taken
    existing = db.query(Tenant).filter(Tenant.name == tenant_in.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A restaurant with this name already exists"
        )
    
    # Generate API key if not provided
    api_key = tenant_in.api_key
    if not api_key:
        # Create a clean slug from the name + a short random hex
        slug = re.sub(r'[^a-zA-Z0-9]', '-', tenant_in.name.lower())
        slug = re.sub(r'-+', '-', slug).strip('-')
        random_suffix = uuid.uuid4().hex[:6]
        api_key = f"{slug}-key-{random_suffix}"
    
    # Check if api key is already taken
    existing_key = db.query(Tenant).filter(Tenant.api_key == api_key).first()
    if existing_key:
        # fallback to simple random key
        api_key = f"key-{uuid.uuid4().hex[:12]}"
        
    db_tenant = Tenant(name=tenant_in.name, api_key=api_key)
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

@router.get("/", response_model=List[TenantResponse])
async def list_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).all()
    return tenants
