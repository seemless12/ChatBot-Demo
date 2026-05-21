from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models import get_db, SystemPrompt, Tenant
from app.auth import get_current_tenant

router = APIRouter(prefix="/system-prompt", tags=["configuration"])


class PromptUpdate(BaseModel):
    prompt_text: str


@router.get("/")
async def get_system_prompt(
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    prompt = db.query(SystemPrompt).filter(SystemPrompt.tenant_id == tenant.id).first()
    if not prompt:
        return {"prompt_text": "You are a helpful restaurant assistant."}
    return {"prompt_text": prompt.prompt_text}


@router.put("/")
async def update_system_prompt(
    update: PromptUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    prompt = db.query(SystemPrompt).filter(SystemPrompt.tenant_id == tenant.id).first()
    if not prompt:
        prompt = SystemPrompt(tenant_id=tenant.id, prompt_text=update.prompt_text)
        db.add(prompt)
    else:
        prompt.prompt_text = update.prompt_text
    db.commit()
    return {"prompt_text": prompt.prompt_text}
