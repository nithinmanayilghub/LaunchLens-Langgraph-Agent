"""Central configuration for LaunchLens. Loads and parses environment variables from .env."""
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# LLM Configurations
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# SerpApi Config (Google Demand data)
SERP_API_KEY = os.getenv("SERP_API_KEY", "")

# Oxylabs Config (Amazon Supply data)
OXYLABS_USERNAME = os.getenv("OXYLABS_USERNAME", "")
OXYLABS_PASSWORD = os.getenv("OXYLABS_PASSWORD", "")

# Mock mode flags: true if forced via env, or automatic when Oxylabs credentials are missing
OXYLABS_MOCK = (
    os.getenv("OXYLABS_MOCK", "").lower() == "true"
    or not (OXYLABS_USERNAME and OXYLABS_PASSWORD)
)

# Marketplaces
AMAZON_DOMAIN = os.getenv("AMAZON_DOMAIN", "in")

# Memory / Persistence
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "checkpoints.sqlite")
POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres:postgres@localhost:5442/launchlens?sslmode=disable")

# Summarization Knobs
MAX_MESSAGES = int(os.getenv("MAX_MESSAGES", 12))
KEEP_LAST = int(os.getenv("KEEP_LAST", 6))
