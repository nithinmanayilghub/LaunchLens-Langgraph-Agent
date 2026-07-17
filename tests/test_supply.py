import os
import json
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# Load environment variables from .env file
load_dotenv()

from backend.graph import supply_node

def test_supply():
    print("=== Testing supply_node ===")
    print(f"OXYLABS_USERNAME present: {'Yes' if os.environ.get('OXYLABS_USERNAME') else 'No'}")
    print(f"OXYLABS_PASSWORD present: {'Yes' if os.environ.get('OXYLABS_PASSWORD') else 'No'}")
    print(f"OXYLABS_MOCK: {os.environ.get('OXYLABS_MOCK', 'Not Set')}")
    print(f"OPENAI_API_KEY present: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
    
    # 1. Create a mock state with a human query
    test_state = {
        "messages": [
            HumanMessage(content="I want to launch a stainless-steel insulated water bottle in India under ₹1,500 - is it worth it?")
        ]
    }
    
    print("\nExecuting supply_node...")
    try:
        # 2. Call supply_node
        result = supply_node(test_state)
        
        # 3. Print the result
        for message in result.get("messages", []):
            print("\n--- Analyst Response ---")
            print(message.content)
            print("------------------------")
            
    except Exception as e:
        print(f"\nExecution failed with error: {e}")

if __name__ == "__main__":
    test_supply()
