# Restaurant Chatbot Backend

Multi-tenant SaaS chatbot backend for restaurants using FastAPI and OpenRouter API.

## Features
- Multi-tenant support with API key authentication
- Customizable knowledge base per restaurant
- Customizable system prompt per restaurant
- Chat endpoint with KB context
- Docker support
- Deploy to Render or Railway

## Quick Start

1. Clone and navigate to directory:
```bash
cd restaurant-chatbot
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env and add your API key
```

3. Run locally:
```bash
uvicorn app.main:app --reload
```

4. Create a tenant:
```bash
sqlite3 restaurant_chatbot.db
INSERT INTO tenants (name, api_key) VALUES ('My Restaurant', 'my-unique-api-key-123');
.quit
```

5. Test endpoints:

Chat:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-unique-api-key-123" \
  -d '{"message": "What are your hours?"}'
```

Add KB item:
```bash
curl -X POST http://localhost:8000/kb \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-unique-api-key-123" \
  -d '{"title": "Hours", "content": "Open 9am-10pm daily", "category": "info"}'
```

Set system prompt:
```bash
curl -X PUT http://localhost:8000/system-prompt \
  -H "Content-Type: application/json" \
  -H "X-API-Key: my-unique-api-key-123" \
  -d '{"prompt_text": "You are a friendly restaurant staff member."}'
```

## Endpoints

- `POST /chat` - Send a message and get AI response
- `POST /kb` - Add knowledge base item
- `GET /kb` - List knowledge base items
- `PUT /kb/{id}` - Update KB item
- `DELETE /kb/{id}` - Delete KB item
- `GET /system-prompt` - Get current system prompt
- `PUT /system-prompt` - Update system prompt
- `GET /health` - Health check

## Deployment

### Render
1. Push to GitHub
2. Create new service on Render
3. Connect repo and configure as Docker service
4. Add environment variables from .env

### Railway
1. Push to GitHub
2. Connect to Railway
3. Deploy with environment variables

## API Key Format
Each restaurant uses `X-API-Key` header with their unique API key.
