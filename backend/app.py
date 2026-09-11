import os
from typing import List
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CrossAI Unified Context Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONVERSATIONS = {}

class Message(BaseModel):
    role: str
    content: str

class ConversationImportRequest(BaseModel):
    provider: str
    conversation_id: str
    title: str
    url: str
    messages: List[Message]

class ContextRetrievalRequest(BaseModel):
    query: str
    target_provider: str
    active_conversation_id: str

class UnifiedConversationItem(BaseModel):
    conversation_id: str
    provider: str
    title: str
    url: str
    updated_at: datetime

@app.get("/api/v1/conversations/unified", response_model=List[UnifiedConversationItem])
async def get_unified_history():
    items = [
        UnifiedConversationItem(
            conversation_id=c["conversation_id"],
            provider=c["provider"],
            title=c["title"],
            url=c["url"],
            updated_at=c["updated_at"]
        )
        for c in DB_CONVERSATIONS.values()
    ]
    return sorted(items, key=lambda x: x.updated_at, reverse=True)

@app.post("/api/v1/sync/import", status_code=201)
async def import_conversation(payload: ConversationImportRequest):
    conv_dict = payload.model_dump()
    conv_dict["updated_at"] = datetime.utcnow()
    DB_CONVERSATIONS[payload.conversation_id] = conv_dict
    return {"status": "accepted", "id": payload.conversation_id}

@app.post("/api/v1/search/context")
async def retrieve_cross_context(payload: ContextRetrievalRequest):
    conv = DB_CONVERSATIONS.get(payload.active_conversation_id)
    
    if not conv:
        for item in DB_CONVERSATIONS.values():
            if payload.active_conversation_id in item["conversation_id"] or item["conversation_id"] in payload.active_conversation_id:
                conv = item
                break

    if conv and "messages" in conv:
        formatted_messages = [f"[{m['role'].upper()}]: {m['content']}" for m in conv["messages"]]
        return {"context": "\n".join(formatted_messages)}
    elif conv:
        return {"context": f"Topic: {conv['title']} (Source: {conv['provider'].upper()})"}
        
    return {"context": ""}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)