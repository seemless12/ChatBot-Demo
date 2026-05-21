from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Optional
from .models import get_db, Tenant


def get_current_tenant(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> Tenant:
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "X-API-Key"}
        )
    tenant = db.query(Tenant).filter(Tenant.api_key == x_api_key).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    return tenant
