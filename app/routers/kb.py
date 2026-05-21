from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.models import get_db, KBItem, Tenant
from app.auth import get_current_tenant

router = APIRouter(prefix="/kb", tags=["knowledge-base"])


class KBItemCreate(BaseModel):
    title: str
    content: str
    category: str = "general"


class KBItemUpdate(BaseModel):
    title: str = None
    content: str = None
    category: str = None


@router.post("/")
async def create_kb_item(
    item: KBItemCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    db_item = KBItem(
        tenant_id=tenant.id,
        title=item.title,
        content=item.content,
        category=item.category
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return {"id": db_item.id, "title": db_item.title}


@router.get("/")
async def list_kb_items(
    category: str = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    query = db.query(KBItem).filter(KBItem.tenant_id == tenant.id)
    if category:
        query = query.filter(KBItem.category == category)
    items = query.all()
    return [{"id": i.id, "title": i.title, "content": i.content, "category": i.category} for i in items]


@router.put("/{item_id}")
async def update_kb_item(
    item_id: int,
    item: KBItemUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    db_item = db.query(KBItem).filter(
        KBItem.id == item_id,
        KBItem.tenant_id == tenant.id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.title is not None:
        db_item.title = item.title
    if item.content is not None:
        db_item.content = item.content
    if item.category is not None:
        db_item.category = item.category
    db.commit()
    return {"id": db_item.id, "title": db_item.title}


@router.delete("/{item_id}")
async def delete_kb_item(
    item_id: int,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    db_item = db.query(KBItem).filter(
        KBItem.id == item_id,
        KBItem.tenant_id == tenant.id
    ).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"deleted": True}
