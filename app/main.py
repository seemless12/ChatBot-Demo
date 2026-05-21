import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, kb, config, tenants, orders

app = FastAPI(title="Restaurant Chatbot Backend", version="1.0.0")

# Enable CORS for frontend started separately
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return JSONResponse({"status": "ok"})


app.include_router(chat.router)
app.include_router(kb.router)
app.include_router(config.router)
app.include_router(tenants.router)
app.include_router(orders.router)
