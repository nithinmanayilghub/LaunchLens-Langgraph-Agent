FROM ghcr.io/astral-sh/uv:python3.12-alpine

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy lock and project files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync (excluding development dependencies)
RUN uv sync --frozen --no-dev --no-install-project

# Copy the rest of the project source code
COPY . .

# Expose FastAPI port
EXPOSE 8010

# Run FastAPI app
CMD ["uv", "run", "uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8010"]
