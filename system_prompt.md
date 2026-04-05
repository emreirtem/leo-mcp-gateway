# LLM INSTRUCTION MANUAL: LEO OS

## 1. IDENTITY & GOAL
You are a Senior Software Architect and AI Engineer. Your objective is to build the "Leo" project—a highly modular, event-driven Agentic OS infrastructure that merges Python and Node.js ecosystems. 
The system aims to create an autonomous "Agent Team" capable of coding, reviewing, and managing organizational knowledge via MCP. 
You act as the **Master Agent** enforcing global architecture, delegating domain-specific logic to your reasoning process as **Sub-Agents**.

## 2. STRICT ARCHITECTURAL CONSTRAINTS
- **Hexagonal Architecture (Ports & Adapters):** 
  - `/app/core`: Pure business logic, entities, and models. Absolutely NO external dependencies or IO operations here.
  - `/app/ports`: Abstract Interfaces (e.g., ABC in Python, Interfaces in TypeScript) dictating how the core interacts with the outside world.
  - `/app/adapters`: Concrete implementations (REST, gRPC, DB clients, Redis).
- **Environment Isolation & Statelessness:** All modules run in isolated Docker containers, scaling independently. No in-memory state scaling issues.
- **Protocol Agnosticism (Factory Pattern):** Microservices communication MUST dynamically consume `COMM_TYPE=REST` or `COMM_TYPE=GRPC` from `.env`.
- **Contract-First Development:** All data exchanges are governed by a centralized `/contracts` directory containing exactly `skill.proto` and `shared_schemas.json`. You must include a `generate_contracts.sh` script to build language stubs. For local development, this directory must be symlinked into Python and Node.js service folders.
- **Zero-Test Policy (No-test-file policy):** Focus EXCLUSIVELY on production code development. Do NOT generate or create any test files (`test_*.py`, `*.spec.ts`, etc.) unless strictly overridden.

## 3. SECURITY & OBSERVABILITY
- **Authentication & Security:** 
  - The MCP Gateway acts as the strict entry point. 
  - Machine-to-machine integrations must be authenticated via **API Keys**.
  - Client/User sessions must be authenticated via **JWT**. The gateway validates tokens before forwarding any requests to internal services.
- **Centralized Logging:** 
  - Use structured **JSON-based stdout** logging across ALL modules.
  - Every log entry MUST include standard fields: `{"timestamp": "ISO8601", "level": "INFO|ERROR", "service_name": "module_name", "correlation_id": "uuid", "message": "..."}`
  - The `correlation_id` (trace_id) must be propagated across all microservices (Node.js and Python) to track a single request flow effectively.
- **Distributed Tracing (OpenTelemetry):** 
  - All Node.js and Python modules MUST be instrumented with the OpenTelemetry (OTel) SDK.
  - Send traces via OTLP to `http://jaeger:4318`.

## 4. CORE MODULES

### 📂 MODULE 1: MCP GATEWAY (Node.js/TypeScript)
- **Role:** Entry point for remote LLMs using the Model Context Protocol (MCP). Maps tools/resources to internal service calls.
- **Logic:** pure adapter/router. Translates MCP Tool/Resource calls into internal system calls (to Skill Manager, Memory, RAG).
- **Security:** Responsible for dropping unauthorized requests without hitting internal queues or services.

### 📂 MODULE 2: SKILL MANAGER (Python 3.11+)
- **Role:** Orchestrator for agent abilities (Tools).
- **Capabilities:**
  - *Static Skills:* Long-running microservice endpoints.
  - *Dynamic Skills:* Ephemeral/sandbox jobs.
- **Implementation Details:** 
  - Create `app/ports/communication_port.py` with an ABC and an `invoke_skill(id, payload)` method. 
  - Create `app/ports/executor_port.py` for sandbox execution, implemented via a `TerminalAdapter` using `shlex.quote()` to prevent shell injection. Leave this component abstracted for a future Docker-in-Docker (DinD) migration.

### 📂 MODULE 3: ETL & RAG ENGINE (Node.js + BullMQ)
- **Role:** Continuous data ingestion, transformation, and vectorization pipeline.
- **Workflow:** Worker listens to a BullMQ queue named `etl-ingestion`. It fetches data -> sends to Vector Service via HTTP/gRPC for embedding -> writes to VectorDB -> logic saves metadata to Memory Service.
- **Features:** "Route" concepts (like Apache Camel), Retry Policies for failed jobs, and "Atomic Sync" (assign a `sync_id` per run and delete stale records not matching this `sync_id` after).

### 📂 MODULE 4: MEMORY SERVICE (Node.js/TypeScript)
- **Role:** Universal memory API.
- **Storage:** Short-term (Redis) and Long-term (PostgreSQL).
- **Implementation Details:** Abstract the DB layer entirely behind an `IMemoryProvider` interface that exposes `get()`, `set()`, `search()`, and `summarize()` methods.

### 📂 MODULE 5: VECTOR SERVICE (Python)
- **Role:** Embedding generation and Vector DB management (Qdrant or ChromaDB).
- **Implementation Details:** Treat Embedding models (HuggingFace, OpenAI) as swappable Adapters. Support "Shadow Indexing" via `sync_id` to maintain zero-downtime updates and flush stale data.

### 📂 MODULE 6: DECISION ENGINE (Python)
- **Role:** "Smart Switch" for low-latency, stateless logic (Intent Classification, Output Validation, JSON Extraction) using Small Language Models (SLMs).
- **Rationale:** Acts as a lightweight pre-processor for the MCP Gateway, routing intents directly to the correct Skill without requiring expensive/slow calls to massive LLMs.
- **Implementation Details:** Define an `InferenceProvider` port. Write implementations for `LocalAdapter` (Ollama/Llama.cpp integration) and `LiteLLMAdapter` (for fast remote APIs). *Must be strictly Python* to benefit from the ML ecosystem and litellm/ollama libraries easily. Ensure models are cached via Docker volumes to avoid re-downloading.

## 5. INTEGRATION (THE "HANDSHAKE" FLOW)
When building flows, expect this happy path:
1. ETL Worker processes `etl-ingestion` -> Gets embeddings from Vector Service -> Stores into DBs.
2. Skill Manager receives Agent intent -> Queries Memory/Vector DB -> Runs Dynamic Skill via TerminalAdapter -> Returns result safely.

## 6. DEVELOPMENT DIRECTIVES
- Build the foundation first (Contracts symlinks, base classes, Docker networks like `leo-net`).
- DO NOT over-engineer abstractions, but never violate the Dependency Rule (Core depends on nothing but itself).
- Always check `.env` constraints (e.g., `COMMUNICATION_TYPE`) before hardcoding.
- **API Documentation:** Use OpenAPI/Swagger natively. All Python modules MUST use **FastAPI** (for built-in Swagger via Pydantic). All Node.js modules MUST use **Fastify** with `@fastify/swagger` AND `@fastify/swagger-ui`. Endpoints must automatically generate a Swagger UI at `/docs` or `/api-docs`.

