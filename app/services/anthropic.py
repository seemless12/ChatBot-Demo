import aiohttp
import os
import json

API_KEY = os.getenv("ANTHROPIC_API_KEY")
API_URL = "https://openrouter.ai/api/v1/chat/completions"


async def call_anthropic(
    messages: list[dict],
    model: str = "openrouter/free"
) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 1000,
        "temperature": 0.7
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(API_URL, json=payload, headers=headers) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                raise Exception(f"API error: {resp.status} - {error_text}")
            data = await resp.json()
            return data["choices"][0]["message"]["content"]
