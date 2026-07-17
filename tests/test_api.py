import os
import json
from fastapi.testclient import TestClient

from backend.api import app

def test_api_endpoints():
    print("=== Testing FastAPI Endpoints ===")
    client = TestClient(app)
    
    # 1. Test GET /api/health
    print("Testing /api/health...")
    res = client.get("/api/health")
    print("Health Status:", res.status_code)
    print("Health JSON:", json.dumps(res.json(), indent=2))
    assert res.status_code == 200
    
    # 2. Test POST /api/chat
    print("\nTesting /api/chat...")
    payload = {
        "message": "I want to launch smart glasses in India - is it worth it?"
    }
    
    res_chat = client.post("/api/chat", json=payload)
    print("Chat Status:", res_chat.status_code)
    
    if res_chat.status_code == 200:
        data = res_chat.json()
        print(f"Assigned Thread ID: {data.get('thread_id')}")
        print(f"Total messages in history: {len(data.get('history', []))}")
        print("\n--- Snippet of Agent Response ---")
        print(data.get("response", "")[:400] + "...")
        print("---------------------------------")
        
        # 3. Test GET /api/history/{thread_id}
        thread_id = data.get("thread_id")
        print(f"\nTesting /api/history/{thread_id}...")
        res_hist = client.get(f"/api/history/{thread_id}")
        print("History Status:", res_hist.status_code)
        if res_hist.status_code == 200:
            hist_data = res_hist.json()
            print(f"Retrieved history count: {len(hist_data.get('history', []))}")
    else:
        print("Chat failed:", res_chat.text)

if __name__ == "__main__":
    test_api_endpoints()
