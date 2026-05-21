from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.models import get_db, Tenant, SystemPrompt, KBItem
from app.auth import get_current_tenant
from app.services.anthropic import call_anthropic

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    response: str


@router.post("/")
async def chat_endpoint(
    request: ChatRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    import re
    import json
    from app.models import Order

    # Get system prompt
    prompt_record = db.query(SystemPrompt).filter(SystemPrompt.tenant_id == tenant.id).first()
    system_prompt = prompt_record.prompt_text if prompt_record else "You are a helpful restaurant assistant."

    # Get KB items for context
    kb_items = db.query(KBItem).filter(KBItem.tenant_id == tenant.id).all()
    kb_context = "\n".join([f"[{item.category}] {item.title}: {item.content}" for item in kb_items])

    # Append instructions for taking orders dynamically
    order_instruction = (
        "\n\nIMPORTANT SYSTEM INSTRUCTION: "
        "You can take customer orders. If the user wants to place an order, you must ask for and collect their: "
        "1. Name\n2. Phone Number\n3. Delivery Address.\n"
        "Once (and only when) you have collected ALL three of these details, and the list of food/drink items they want to order is confirmed, "
        "you MUST finalize the order. To do so, append a single line at the very end of your response in this exact format:\n"
        "[ORDER_DATA: {\"name\": \"CUSTOMER_NAME\", \"phone\": \"CUSTOMER_PHONE\", \"address\": \"DELIVERY_ADDRESS\", \"items\": \"LIST_OF_ITEMS\"}]\n"
        "Ensure the JSON is valid and double-quoted. Replace the values with the actual customer details. "
        "Do not output this tag if you are still asking for details or if they haven't confirmed."
    )

    # Build messages
    messages = [
        {"role": "system", "content": f"{system_prompt}\n\nKnowledge Base:\n{kb_context}{order_instruction}"},
        *request.history,
        {"role": "user", "content": request.message}
    ]

    try:
        response_text = await call_anthropic(messages)
        if response_text is None:
            response_text = "I'm sorry, I encountered an issue generating a response. Please try again."
        
        # Check for order data tag
        pattern = r"\[ORDER_DATA:\s*(\{.*?\})\]"
        match = re.search(pattern, response_text, re.DOTALL)
        if match:
            try:
                order_json = json.loads(match.group(1))
                name = order_json.get("name", "Unknown Customer")
                phone = order_json.get("phone", "No Phone")
                address = order_json.get("address", "No Address")
                items = order_json.get("items", "No Items")
                
                # Create the order in the database
                new_order = Order(
                    tenant_id=tenant.id,
                    customer_name=name,
                    customer_phone=phone,
                    customer_address=address,
                    order_items=items,
                    status="pending"
                )
                db.add(new_order)
                db.commit()
                db.refresh(new_order)
                
                # Remove tag from response and append confirmation
                response_text = re.sub(pattern, "", response_text).strip()
                response_text += "\n\n🎉 *System: Your order has been placed successfully and sent to the kitchen!*"
            except Exception as order_err:
                print(f"Error parsing order from chat: {order_err}")

        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
