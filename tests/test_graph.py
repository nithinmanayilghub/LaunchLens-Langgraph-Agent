import os
import uuid
import json
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# Load env variables
load_dotenv()

from backend.graph import graph

def test_full_graph():
    print("=== Testing full StateGraph integration ===")
    print(f"SERP_API_KEY present: {'Yes' if os.environ.get('SERP_API_KEY') else 'No'}")
    print(f"OXYLABS_USERNAME present: {'Yes' if os.environ.get('OXYLABS_USERNAME') else 'No'}")
    print(f"OPENAI_API_KEY present: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
    
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    
    # 1. First prompt to trigger new validation (should route through research nodes)
    print("\nSending first message (new product validation)...")
    inputs = {
        "messages": [
            HumanMessage(content="I want to launch organic lavender soap in France - is it worth it?")
        ]
    }
    
    try:
        state = graph.invoke(inputs, config=config)
        messages = state.get("messages", [])
        print(f"Total messages in state: {len(messages)}")
        
        # Look for the analyst names in messages
        print("\nNode traces found in history:")
        for m in messages:
            sender = getattr(m, "name", "None") or getattr(m, "additional_kwargs", {}).get("name", "None")
            print(f"- Type: {type(m).__name__}, Sender name: {sender}")
            
        print("\n=== LaunchLens Final Verdict Summary ===")
        print(messages[-1].content)
        print("=========================================")
        
        # 2. Second prompt (follow-up query - should route directly to agent node without fanning out)
        print("\nSending second message (follow-up query)...")
        inputs_followup = {
            "messages": [
                HumanMessage(content="What was the biggest risk identified for this?")
            ]
        }
        state_followup = graph.invoke(inputs_followup, config=config)
        messages_followup = state_followup.get("messages", [])
        print(f"Total messages in state after follow-up: {len(messages_followup)}")
        
        print("\n=== LaunchLens Follow-up Response ===")
        print(messages_followup[-1].content)
        print("======================================")
        
    except Exception as e:
        print(f"Graph execution failed: {e}")

if __name__ == "__main__":
    test_full_graph()
