
from backend.clients.serp_api import get_google_news, get_google_trends
from backend.clients.oxylabs import get_amazon_search, get_amazon_reviews
from backend.clients.constants import get_country_geo, get_amazon_domain
from backend.tools import google_trends_tool, google_news_tool, amazon_search_tool, amazon_reviews_tool
import operator
import json
import os
import requests
import sqlite3
from langchain_core.messages import HumanMessage, RemoveMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.sqlite import SqliteSaver
import psycopg
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

class State(MessagesState):
    summary: str


SYSTEM_PROMPT = """
You are LaunchLens, an elite startup market analyst. Your job is to help entrepreneurs and startup enthusiasts validate product ideas using real market evidence.

Rules:
- Always use the appropriate tools before answering. Never rely on prior knowledge if fresh data is required.
- Use SerpAPI to analyze demand signals (e.g., Google Trends and search results).
- Use Oxylabs to analyze Amazon supply (competitors, pricing, reviews, and listings).
- Never invent or estimate facts. If data is unavailable, explicitly say so.
- Distinguish facts from assumptions.
- Quote all prices with their currency.
- When comparing products, use a concise table or bullet list.

For every product idea:
1. Summarize the idea.
2. Analyze demand.
3. Analyze supply and competitors.
4. Evaluate differentiation.
5. Identify the biggest opportunity and biggest risk.
6. Give a Market Fit Score (1-10) with a brief justification.
7. End with a clear verdict: Go,No-Go, or Niche.

Be concise, analytical, evidence-driven, and willing to challenge weak assumptions. Explain what the evidence means instead of merely summarizing it.
"""


def get_search_keyword(messages: list) -> dict:
    """
    Uses LLM to extract a clean keyword and target country for Google/Amazon searches.
    Returns:
        {
            "keyword": str,
            "country": str
        }
    """

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = """
    Analyze the conversation history and extract the core product keyword and target country.

    Return ONLY a raw JSON object with exactly these keys:
    - "keyword" (string)
    - "country" (string)

    Example:
    {
      "keyword": "insulated water bottle",
      "country": "India"
    }

    Do not add markdown, explanations, or any extra text.
    """

    try:
        response = llm.invoke([SystemMessage(content=prompt)] + messages)

        content = (response.content or "").strip()

        # Remove markdown code fences if the model adds them
        content = (
            content.replace("```json", "")
                   .replace("```", "")
                   .strip()
        )

        data = json.loads(content)

        # Validate JSON type
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object.")

        # Validate required keys
        if "keyword" not in data or "country" not in data:
            raise ValueError("Missing required keys.")

        # Validate value types
        if not isinstance(data["keyword"], str):
            raise ValueError("'keyword' must be a string.")

        if not isinstance(data["country"], str):
            raise ValueError("'country' must be a string.")

        return {
            "keyword": data["keyword"].strip(),
            "country": data["country"].strip() or "Global",
        }

    except Exception:
        # Safe fallback
        last_message = (
            messages[-1].content
            if messages and hasattr(messages[-1], "content")
            else ""
        )

        return {
            "keyword": last_message.strip(),
            "country": "Global",
        }

def demand_node(state: State) -> dict:
    """Fetches search interest from Google Trends and market news from Google News using SerpApi."""
    try:
        # 1. Extract clean keyword & target country
        search_info = get_search_keyword(state["messages"])
        keyword = search_info.get("keyword", "product")
        country = search_info.get("country", "Global")
        
        geo = get_country_geo(country)
        # 2. Fetch trends and news data (handles API calls and mock fallback internally)
        trends_data = get_google_trends(keyword, country, geo)
        news_data = get_google_news(keyword)
            
        # 3. Formulate the slim JSON payload for the LLM
        research_summary = {
            "keyword": keyword,
            "target_country": country,
            "google_trends": trends_data,
            "google_news": news_data
        }
        
        return {
            "messages": [
                SystemMessage(
                    content=f"Google Demand Data:\n{json.dumps(research_summary, indent=2)}",
                    name="demand_analyst"
                )
            ]
        }
    except Exception as e:
        return {
            "messages": [
                SystemMessage(
                    content=f"Demand Analysis Error: Failed to perform search. Error: {str(e)}",
                    name="demand_analyst"
                )
            ]
        }
def supply_node(state: State) -> dict:
    """Fetches supply data from Amazon using Oxylabs, analyzing listings and reviews for gaps."""
    try:
        # 1. Extract clean keyword & target country
        search_info = get_search_keyword(state["messages"])
        keyword = search_info.get("keyword", "product")
        country = search_info.get("country", "Global")
        
        # 2. Determine Amazon domain based on target country
        domain = get_amazon_domain(country)
        # 3. Fetch top listings from Amazon Search
        listings = get_amazon_search(keyword, domain=domain)
        
        # 4. Fetch reviews for the top product listing to find gaps/pain points
        reviews = []
        if listings:
            top_asin = listings[0].get("asin")
            reviews = get_amazon_reviews(top_asin, keyword=keyword, domain=domain)
            
        # 5. Formulate the slim JSON payload for the LLM
        research_summary = {
            "keyword": keyword,
            "target_country": country,
            "amazon_domain": domain,
            "top_listings": listings,
            "representative_reviews": reviews
        }
        
        return {
            "messages": [
                SystemMessage(
                    content=f"Amazon Supply Data:\n{json.dumps(research_summary, indent=2)}",
                    name="supply_analyst"
                )
            ]
        }
    except Exception as e:
        return {
            "messages": [
                SystemMessage(
                    content=f"Supply Analysis Error: Failed to perform search. Error: {str(e)}",
                    name="supply_analyst"
                )
            ]
        }

def agent_node(state: State) -> dict:
    """The core analyst agent that reviews the market reports and chats with the user."""
    # Prepend existing summary if present
    system_content = SYSTEM_PROMPT
    existing_summary = state.get("summary", "")
    if existing_summary:
        system_content += f"\n\nSummary of earlier conversation:\n{existing_summary}"
        
    messages = [SystemMessage(content=system_content)] + state["messages"]
    
    # Initialize LLM and bind tools
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)
    llm_with_tools = llm.bind_tools([
        google_trends_tool,
        google_news_tool,
        amazon_search_tool,
        amazon_reviews_tool
    ])
    
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

def summarize_node(state: State) -> dict:
    """Summarizes the conversation history if it exceeds the message threshold to bounded context."""
    # Read thresholds from environment or defaults (matches .env)
    max_messages = int(os.environ.get("MAX_MESSAGES", 12))
    keep_last = int(os.environ.get("KEEP_LAST", 6))
    
    messages = state.get("messages", [])
    if len(messages) > max_messages:
        # Separate the history to summarize and keep
        to_summarize = messages[:-keep_last]
        
        # Build prompt to summarize
        summary_prompt = (
            "Summarize the conversation history so far. Focus on key startup product ideas, "
            "verdicts, target countries, opportunities, and risks. Keep it concise."
        )
        
        existing_summary = state.get("summary", "")
        if existing_summary:
            summary_prompt += f"\n\nExisting summary of previous history:\n{existing_summary}"
            
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        summary_messages = to_summarize + [SystemMessage(content=summary_prompt)]
        response = llm.invoke(summary_messages)
        new_summary = response.content
        
        # Yield RemoveMessage objects to delete summarized messages from the state
        delete_messages = [RemoveMessage(id=m.id) for m in to_summarize if m.id]
        
        return {
            "summary": new_summary,
            "messages": delete_messages
        }
        
    return {}

def route_intent(state: State) -> list[str] | str:
    """
    Routes the execution flow based on the user's intent.
    If the user is asking to validate/research a new product idea, routes to parallel research ('demand' and 'supply').
    Otherwise, routes directly to the agent node ('agent').
    """
    messages = state.get("messages", [])
    if not messages:
        return "agent"
        
    # Look for the last human message
    last_human = None
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_human = m.content
            break
            
    if not last_human:
        return "agent"
        
    # Use LLM to classify user intent
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    
    prompt = f"""
    You are an intent router for a startup market intelligence analyst system.
    Analyze the user's latest query and classify if it is a request to validate or research a product/business idea (e.g., "I want to launch...", "Should I build...", "Is X a good business?", "Validate X", "Analyze the market for Y").
    
    User Query: "{last_human}"
    
    Return exactly one of these two labels:
    - "research" if they want to run a new market/product research scan.
    - "chat" if it's a follow-up query, clarification, question about prior findings, or general conversation.
    
    Do not add any markdown, explanation, or extra characters. Return only "research" or "chat".
    """
    
    try:
        response = llm.invoke([SystemMessage(content=prompt)])
        result = (response.content or "").strip().lower()
        if "research" in result:
            return ["demand", "supply"]
        else:
            return "agent"
    except Exception as e:
        print(f"Intent routing classification failed: {e}. Defaulting to agent.")
        return "agent"

# Initialize StateGraph
workflow = StateGraph(State)

# Add all nodes
workflow.add_node("summarize", summarize_node)
workflow.add_node("demand", demand_node)
workflow.add_node("supply", supply_node)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode([
    google_trends_tool,
    google_news_tool,
    amazon_search_tool,
    amazon_reviews_tool
]))

# Set Entrypoint
workflow.set_entry_point("summarize")

# Add conditional routing edge from summarize node
workflow.add_conditional_edges(
    "summarize",
    route_intent,
    {
        "demand": "demand",
        "supply": "supply",
        "agent": "agent"
    }
)

# Wire parallel branches to the agent node (fan-in / merge)
workflow.add_edge("demand", "agent")
workflow.add_edge("supply", "agent")

# Add conditional routing from agent node for tool execution
workflow.add_conditional_edges(
    "agent",
    tools_condition
)

# Loop back from tools node to agent node
workflow.add_edge("tools", "agent")

# Compile with persistence checkpointer (tries PostgreSQL first, falls back to SQLite)
postgres_uri = os.environ.get("POSTGRES_URI") or os.environ.get("DATABASE_URL")
checkpointer = None

if postgres_uri:
    try:
        # Create connection pool with autocommit and dict_row settings required for PostgresSaver
        pool = ConnectionPool(
            conninfo=postgres_uri,
            max_size=10,
            kwargs={"autocommit": True, "row_factory": dict_row}
        )
        # Test the connection immediately to trigger failure/fallback if offline
        with pool.connection(timeout=3) as conn:
            pass
            
        checkpointer = PostgresSaver(pool)
        checkpointer.setup()
        print("Connected to PostgreSQL checkpointer successfully (using connection pool).")
    except Exception as e:
        print(f"PostgreSQL connection failed ({e}). Falling back to SQLite...")
        checkpointer = None

if checkpointer is None:
    db_path = os.environ.get("SQLITE_DB_PATH", "checkpoints.sqlite")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn)
    print("Using local SQLite checkpointer.")

# Export the compiled graph
graph = workflow.compile(checkpointer=checkpointer)

