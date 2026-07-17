from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from backend import config
from backend.graph import graph


app = FastAPI(
    title="LaunchLens API",
    description="Backend API for the LaunchLens Market Intelligence Agent built with LangGraph.",
    version="1.0.0"
)

# Enable CORS for potential frontend integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thread_id: str
    history: List[Dict[str, str]]

def serialize_message(m: Any) -> Dict[str, str]:
    """Helper to convert LangChain messages into a simple role/content format."""
    msg_type = m.__class__.__name__
    if msg_type == "HumanMessage":
        role = "user"
    elif msg_type == "AIMessage":
        role = "assistant"
    elif msg_type == "SystemMessage":
        # Identify custom analyst senders if name is present
        role = m.name if m.name else "system"
    else:
        role = "unknown"
        
    return {
        "role": role,
        "content": m.content
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Use existing thread_id or create a new one to track conversation state
        thread_id = request.thread_id or str(uuid.uuid4())
        config = {"configurable": {"thread_id": thread_id}}
        
        # Invoke the graph with the new user message
        inputs = {"messages": [("user", request.message)]}
        state = graph.invoke(inputs, config=config)
        
        messages = state.get("messages", [])
        if not messages:
            raise HTTPException(status_code=500, detail="No messages returned from the agent graph.")
            
        # Get the latest AI response content
        last_msg = messages[-1]
        response_text = last_msg.content
        
        # Serialize the entire conversation history
        history = [serialize_message(m) for m in messages]
        
        return ChatResponse(
            response=response_text,
            thread_id=thread_id,
            history=history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {str(e)}")

@app.get("/api/history/{thread_id}")
async def get_history(thread_id: str):
    try:
        config = {"configurable": {"thread_id": thread_id}}
        state = graph.get_state(config)
        
        messages = state.values.get("messages", []) if state.values else []
        history = [serialize_message(m) for m in messages]
        
        return {
            "thread_id": thread_id,
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(config.OPENAI_API_KEY),
        "serpapi_configured": bool(config.SERP_API_KEY),
        "oxylabs_configured": bool(config.OXYLABS_USERNAME and config.OXYLABS_PASSWORD)

    }
