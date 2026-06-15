# Assignment 3 (LaunchLens) - Scoring Rubric (100 marks + 10 bonus)

Graded on the submitted repo, the presentation, and the demo video. Each section lists what earns marks and what loses them. Partial credit throughout. We may ask you to explain any part of your code; not being able to explain it caps that section.

> The product is **fixed** (everyone builds LaunchLens), so there are **no marks for "the idea."** Marks are for **how well you build, integrate, and present it.**

---

## 1. LangGraph Mastery - **45 marks** (the core)

All five concepts must be present **and** correctly used. Each must be mapped in your README to file + function + line.

| Concept | What earns full marks | Marks |
|---------|------------------------|------:|
| **State & graph construction** | Typed `StateGraph` state, sensible fields, reducers used where state merges (fan-out results, message lists). Clean, readable `START→…→END` wiring. | 9 |
| **Fan-out (parallel)** | Graph genuinely branches to ≥2 nodes that run in parallel and **merge** correctly (proper reducer, no lost/overwritten state). Not sequential calls pretending to be parallel. | 9 |
| **Routing (conditional edges)** | A real decision node that inspects intent/state and routes to different paths. Logic is sound and covers its cases (incl. a sensible default). | 9 |
| **Agent node + tools** | LLM agent bound to SerpApi + Oxylabs tools; correct agent↔tools loop; good tool docstrings (written for the LLM); tools return slim JSON; tool errors handled, not crashing. | 9 |
| **Short-term memory + summarization** | Working **checkpointer** (survives restart, keyed by thread) **and** a **summarization node** that triggers correctly on long chats, bounds the context window, and preserves key facts without corrupting tool-call sequences. | 9 |

**Loses marks:** a concept "present" but non-functional; fan-out that's actually sequential; routing with one path; summarization that drops critical context or breaks tool calls; raw scrapes shoved into the LLM.

> A missing required concept = **0 for that row**. You cannot pass this section by doing four of five very well.

---

## 2. Data Integration: SerpApi + Oxylabs - **20 marks**

| Criteria | Marks |
|----------|------:|
| **SerpApi used meaningfully** - ≥2 engines (Trends / Shopping / News / Search…) doing real work in the product flow. | 6 |
| **Oxylabs used meaningfully** - ≥2 sources (search / product / pricing / bestsellers / reviews / universal) doing real work. | 6 |
| **Genuine fusion across both** - the agent *combines* demand + supply to reason (e.g. "Trends rising + Amazon reviews complain about leaking → opportunity"), not two siloed features. | 6 |
| **Live proof** - demo shows ≥1 real live call per provider (or a clearly documented recording). | 2 |

**Loses marks:** one provider is decorative; data sources never combine; everything mocked with no live evidence.

---

## 3. Code Quality & Scalability - **20 marks**

| Criteria | Marks |
|----------|------:|
| **Structure & readability** - sensible modules (tools / graph / config / clients separated), clear names, no dead code, consistent style. | 6 |
| **Error handling & robustness** - API failures, empty results, and bad input handled gracefully; the agent degrades instead of crashing. | 5 |
| **Token & cost discipline** - slim tool outputs, caching where sensible, summarization keeping context bounded. | 4 |
| **Scalability mindset** - stateless-where-possible design, thread-id concurrency, config via env (not hardcoded), DB-backed checkpointer (Postgres-ready), no global mutable footguns. Short "how this scales" note in README. | 5 |

**Loses marks:** one giant file; secrets hardcoded; copy-pasted boilerplate; no error handling; raw responses passed around; design that breaks with >1 concurrent user.

---

## 4. Presentation, Demo Video & Documentation - **15 marks**

This is how you communicate what you built. A great agent with no story loses real marks here.

| Criteria | Marks |
|----------|------:|
| **Demo video (≥2 min, screen-recorded)** - clearly explains *what LaunchLens is* and the problem it solves, **and** shows it actually running: a real conversation, a Go/No-Go verdict, and memory across turns. Clear audio/narration. | 6 |
| **Presentation / slides** - explains the product, the graph architecture, and your data-fusion approach. Clean and easy to follow. | 4 |
| **GitHub repo hygiene** - public, clean, runnable from the README alone; `.env.example` present; secrets gitignored. | 3 |
| **README + concept map + graph diagram** - setup, the 5-concept map (file/function/line), demo script, and an accurate graph diagram. | 2 |

**Loses marks:** video under 2 min or just silent screen-scrolling; slides missing or unreadable; repo that won't run from the README; no graph diagram or concept map.

---

## Bonus - **up to +10 marks**

Earned *only* after the core is solid. Examples:
- **Long-term memory** (cross-thread / persistent user profile / vector store) - the topic we just started. (+ up to 4)
- **Evaluation** - a small test/eval harness for tool outputs or agent answers. (+ up to 3)
- **Polished UI or API** layer (e.g. FastAPI + React). (+ up to 3)
- **Streaming** the agent's thinking/tool-calls to the user. (+ up to 2)
- **Novel tools / data sources** beyond the required two, used well. (+ up to 2)

(Bonus is capped at +10 total; grade ceiling is 110.)

---

## Quick self-check before you submit

- [ ] Can a grader clone, set keys, and run it from the README alone?
- [ ] Are **all five** LangGraph concepts present, working, and mapped to code?
- [ ] Do **both** SerpApi and Oxylabs do real work - and **combine**?
- [ ] Does memory survive a restart? Does summarization fire on a long chat?
- [ ] Tools return slim JSON, secrets gitignored, errors handled?
- [ ] Is there a **≥2-minute demo video** and a **presentation** linked in the README?
