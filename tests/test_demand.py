import os
import json
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# Load environment variables from .env file
load_dotenv()

from backend.graph import demand_node

def test_demand():
    print("=== Testing demand_node ===")
    print(f"SERP_API_KEY present: {'Yes' if os.environ.get('SERP_API_KEY') else 'No'}")
    print(f"OPENAI_API_KEY present: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
    
    # 1. Create a mock state with a human query
    test_state = {
        "messages": [
            HumanMessage(content="I want to launch a Smart glasses Business  in India - is it worth it?")
        ]
    }
    
    print("\nExecuting demand_node...")
    try:
        # 2. Call demand_node
        result = demand_node(test_state)
        
        # 3. Print the result
        for message in result.get("messages", []):
            print("\n--- Analyst Response ---")
            print(message.content)
            print("------------------------")
            
    except Exception as e:
        print(f"\nExecution failed with error: {e}")

if __name__ == "__main__":
    test_demand()
