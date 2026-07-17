# 🔭 LaunchLens: Enterprise Market Intelligence Agent

LaunchLens is an advanced, production-grade conversational AI analyst built with **LangGraph** to fuse real-time Google search demand signals with Amazon supply reality. It helps entrepreneurs and product managers validate business ideas through data-driven feasibility scores, market risk matrices, and product positioning strategies.

---

## ⚡ Quick Capabilities Overview

- **Demand Validation (Google Trends & News)**: Dynamically checks query interest trajectories, related breakout searches, and recent news alerts via SerpApi.
- **Supply Reality (Amazon Scrape & Mining)**: Gathers pricing structures, brand dominance, star ratings, and parses reviews to mine customer pain points via Oxylabs.
- **Fused Feasibility Verdicts**: Unifies demand and supply insights to deliver a structured **Go / No-Go / Niche** verdict with clear differentiation vectors.
- **Short-Term Memory & Auto-Summarization**: Employs persistent checkpointers to preserve conversation context while automatically compressing histories over 12 turns to prevent context window overflow.

---

## 🏗️ Architecture & Data Flow

LaunchLens utilizes a stateful, cyclic graph with parallel execution branches (fan-out) and intent-based routing.

```mermaid
flowchart TD
    U([Founder Query / Chat]) --> S[Summarize Node]
    
    subgraph Memory & State Persistence
        S
        CP[("Checkpointer Store\n(PostgreSQL / SQLite fallback)")]
    end

    S --> R{Intent Classifier}
    
    subgraph Parallel Research Scan (Fan-Out)
        R -->|Intent: Research| DN[Demand Analyst Node\n(SerpApi)]
        R -->|Intent: Research| SN[Supply Analyst Node\n(Oxylabs)]
    end

    R -->|Intent: Chat / Follow-up| AG[Core Agent Node\n(GPT-4o-mini)]

    DN --> AG
    SN --> AG

    subgraph Cyclic Tool Executions
        AG <-->|Condition: Calls Tools| TL["Tool Runner Node\n- google_trends_tool\n- google_news_tool\n- amazon_search_tool\n- amazon_reviews_tool"]
    end
    
    AG -->|Condition: Final Response| V[Go/No-Go/Niche Verdict] --> E([END])
    
    CP -.->|Saves state after each step| S
    CP -.->|Loads & saves state| AG
```

---

## 🗺️ LangGraph Concept Map

The table below maps the required LangGraph engineering concepts to their implementation inside the codebase:

| Core Concept | Code Reference | Technical Description |
| :--- | :--- | :--- |
| **1. Graph Construction & State** | [`backend/graph.py` (Lines 21-23)](backend/graph.py#L21-L23)<br>[`backend/graph.py` (Lines 315-386)](backend/graph.py#L315-L386) | Defines the typed `State` schema using standard LangChain message buffers and compiles the graph topology. |
| **2. Fan-out (Parallel Execution)** | [`backend/graph.py` (Lines 306-307)](backend/graph.py#L306-L307)<br>[`backend/graph.py` (Lines 344-345)](backend/graph.py#L344-L345) | Concurrently fires `demand_node` and `supply_node` to research Google and Amazon trends simultaneously, merging outputs on fan-in. |
| **3. Routing (Conditional Edges)** | [`backend/graph.py` (Lines 267-313)](backend/graph.py#L267-L313)<br>[`backend/graph.py` (Lines 333-341)](backend/graph.py#L333-L341) | Evaluates user input via an LLM intent routing node, classifying queries into a `research` scan or a `chat` dialogue. |
| **4. Agent Node & Tools** | [`backend/graph.py` (Lines 209-229)](backend/graph.py#L209-L229)<br>[`backend/tools.py` (Lines 10-44)](backend/tools.py#L10-L44)<br>[`backend/graph.py` (Lines 348-351)](backend/graph.py#L348-L351) | Runs the primary analyst node in a cyclic loop with tool callers, wrapping API endpoints as LangChain tools. |
| **5. Short-Term Memory** | [`backend/graph.py` (Lines 231-265)](backend/graph.py#L231-L265)<br>[`backend/graph.py` (Lines 360-383)](backend/graph.py#L360-L383) | Persists sessions over restarts via PostgreSQL/SQLite savers, running a custom summarization node that compacts old message arrays. |

---

## ⚡ Quick Start

### Prerequisites
- Python `3.12`
- Node.js `18+` (Optional, for frontend web view)
- API Keys:
  - `OPENAI_API_KEY` (Required)
  - `SERP_API_KEY` (Optional; system falls back to mock mode if omitted)
  - `OXYLABS_USERNAME` & `OXYLABS_PASSWORD` (Optional; system falls back to mock mode if omitted)

### Option A: Local Run (Recommended)

1. **Clone & Navigate**
   ```bash
   git clone https://github.com/nithinmanayilghub/LaunchLens-Langgraph-Agent.git
   cd LaunchLens-Langgraph-Agent
   ```

2. **Configure Environment**
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your keys (at minimum, `OPENAI_API_KEY`).

3. **Install Dependencies**
   LaunchLens uses `uv` for virtual environment setup:
   ```bash
   # Install uv if not already present
   pip install uv
   
   # Synchronize packages from lockfile
   uv sync
   ```

4. **Run the Interactive CLI REPL**
   ```bash
   uv run python backend/cli.py chat
   ```

5. **Start Web Application**
   - Run the FastAPI backend:
     ```bash
     uv run python backend/cli.py serve --port 8010
     ```
   - In a new terminal window, boot the React frontend:
     ```bash
     cd frontend
     npm install
     npm run dev
     ```
     Access the web portal at `http://localhost:5173`.

---

### Option B: Run via Docker Compose

To spin up the backend, frontend, and a PostgreSQL checkpointer database concurrently:

```bash
docker-compose -f docker.yaml up --build
```
- Web UI: `http://localhost:5173`
- API Server: `http://localhost:8010`

---

## 💬 Verification Prompts

You can test LaunchLens' workflow features in the CLI or Web UI using these paths:

1. **Deep Research Trigger (Fan-Out & Routing)**
   > **User:** *"I want to launch a stainless-steel insulated water bottle in India under ₹1,500 - is it worth it?"*
   - *Expected Behavior*: Classified as `research` -> triggers parallel Google Trends/News + Amazon Search queries -> compiles structured analysis, pricing metrics, and outputs a **Go/No-Go/Niche** verdict.
   
2. **Context Memory & Follow-up**
   > **User:** *"What about the US market? How does the competitor landscape compare?"*
   - *Expected Behavior*: Classified as `chat` -> retrieves previous history from checkpointer -> merges context to perform new comparative calculations for the US.

3. **Context Condensation Node**
   > Continue chatting past 12 turns.
   - *Expected Behavior*: The `summarize` node runs automatically, truncating the message history while compressing key facts into the graph's `summary` state.

---

## ⚙️ Env Configuration Options

| Variable Name | Default / Type | Purpose |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | `sk-...` | Triggers GPT-4o-mini agent reasoning and summaries. |
| `SERP_API_KEY` | `string` | Query authorization for Google Trends, Shopping, and News. (Mocked if empty). |
| `OXYLABS_USERNAME` | `string` | Username for Oxylabs E-Commerce API (Mocked if empty). |
| `OXYLABS_PASSWORD` | `string` | Password for Oxylabs E-Commerce API. |
| `SQLITE_DB_PATH` | `checkpoints.sqlite` | Location for local SQLite checkpoint file database. |
| `POSTGRES_URI` | `string` | Postgres connection string (Automatically falls back to SQLite if absent). |
