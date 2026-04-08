# Embedding-Based Model Router Specification

## Overview
The Embedding Router is a semantic routing layer within the Decision Engine that determines which expert model should handle a given user query based on embedding similarity rather than traditional intent classification.

## Core Concept
Instead of rule-based or classifier-based routing, this module uses:
1. **Query Embedding**: Convert incoming queries to dense vectors using a lightweight embedding model
2. **Expert Profiles**: Pre-defined expert models with their semantic embeddings and metadata
3. **Similarity Matching**: Cosine similarity between query and expert embeddings
4. **Confidence-Based Routing**: Route to best-matching expert if confidence exceeds threshold

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Embedding Router                         │
├─────────────────────────────────────────────────────────────┤
│  Input: User Query (text)                                   │
│                      ↓                                      │
│  ┌─────────────────────────────────────┐                   │
│  │  1. Query Embedder                 │                   │
│  │     - Model: lightweight (e.g.,   │                   │
│  │       all-MiniLM-L6-v2 or          │                   │
│  │       multilingual-e5-small)       │                   │
│  │     - Output: 384-dim vector       │                   │
│  └─────────────────────────────────────┘                   │
│                      ↓                                      │
│  ┌─────────────────────────────────────┐                   │
│  │  2. Expert Registry                │                   │
│  │     - JSON/YAML stored profiles    │                   │
│  │     - Each expert has:             │                   │
│  │       * id, name, description       │                   │
│  │       * pre-computed embedding      │                   │
│  │       * endpoint URL                │                   │
│  │       * capabilities/tags           │                   │
│  │       * prompt template (optional)  │                   │
│  └─────────────────────────────────────┘                   │
│                      ↓                                      │
│  ┌─────────────────────────────────────┐                   │
│  │  3. Similarity Engine                │                   │
│  │     - Cosine similarity calculation │                   │
│  │     - Top-K retrieval (default: 3) │                   │
│  │     - Score normalization           │                   │
│  └─────────────────────────────────────┘                   │
│                      ↓                                      │
│  ┌─────────────────────────────────────┐                   │
│  │  4. Decision Logic                   │                   │
│  │     - Threshold check (default: 0.7) │                   │
│  │     - If above: route to expert     │                   │
│  │     - If below: fallback routing    │                   │
│  │       (general LLM or human)        │                   │
│  └─────────────────────────────────────┘                   │
│                      ↓                                      │
│  Output: RouteDecision {                                    │
│    expert_id: string,                                       │
│    confidence: float,                                       │
│    endpoint: string,                                        │
│    reasoning: string,                                       │
│    fallback: boolean                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### ExpertProfile
```json
{
  "id": "code-expert-v1",
  "name": "Code Specialist",
  "description": "Expert in Python, JavaScript, and software architecture. Handles code generation, review, debugging, and refactoring tasks.",
  "embedding": [0.023, -0.045, 0.12, ...], // 384-dim pre-computed
  "endpoint": "http://llm-code:8080/v1/chat/completions",
  "model_type": "llama-3-8b-instruct",
  "capabilities": ["code_gen", "code_review", "debugging", "refactoring"],
  "tags": ["python", "javascript", "typescript", "software-engineering"],
  "prompt_template": "You are an expert software engineer...",
  "context_window": 8192,
  "cost_per_token": 0.0001,
  "timeout_ms": 30000
}
```

### RouteRequest
```json
{
  "query": "How do I refactor this Python function to use async/await?",
  "context": {
    "session_id": "uuid",
    "previous_expert": "general-v1",
    "conversation_history": []
  },
  "options": {
    "top_k": 3,
    "threshold": 0.7,
    "include_scores": true
  }
}
```

### RouteDecision
```json
{
  "expert_id": "code-expert-v1",
  "confidence": 0.89,
  "endpoint": "http://llm-code:8080/v1/chat/completions",
  "reasoning": "Query strongly matches code-expert (cosine_sim: 0.89). Keywords: refactor, python, async/await.",
  "fallback": false,
  "alternatives": [
    {"expert_id": "general-v1", "confidence": 0.45}
  ],
  "latency_ms": 12
}
```

## Expert Registry Management

### Initial Expert Set

1. **code-expert**: Software engineering tasks
2. **tfs-wiki-expert**: TFS/Azure DevOps knowledge retrieval
3. **general-expert**: General conversation, fallback
4. **data-analyst**: SQL, data processing, analytics
5. **doc-writer**: Documentation, technical writing

### Registry Storage
- Primary: PostgreSQL table `expert_profiles`
- Cache: Redis for hot profiles
- Backup: JSON file export/import

### Embedding Generation Workflow
```
For each new expert:
  1. Collect representative queries (10-50 samples)
  2. Compute embeddings for each
  3. Average to get expert centroid embedding
  4. Store in registry
```

## API Endpoints

### POST /route
Main routing endpoint. Takes query, returns routing decision.

### GET /experts
List all registered experts.

### POST /experts
Register new expert profile.

### PUT /experts/{id}/embeddings
Update expert embedding (e.g., after fine-tuning with new examples).

### GET /health
Service health check with model load status.

## Configuration

```yaml
embedding_router:
  # Embedding model settings
  embedder:
    model_name: "sentence-transformers/all-MiniLM-L6-v2"
    device: "cpu"  # or "cuda" if available
    batch_size: 32
    
  # Routing logic
  routing:
    default_threshold: 0.7
    top_k: 3
    fallback_expert: "general-expert"
    
  # Performance
  cache:
    enabled: true
    ttl_seconds: 300
    max_size: 10000
    
  # Registry
  registry:
    storage: "postgres"  # or "json"
    auto_reload: true
    reload_interval_sec: 60
```

## Integration Points

### With MCP Gateway
- Gateway receives external request
- Calls Decision Engine `/route` endpoint
- Decision Engine returns expert endpoint
- Gateway proxies to appropriate expert LLM

### With Skill Manager
- Expert profiles can trigger specific skills
- Routing decision can include required skills
- Skill Manager executes in sandbox

### With Memory Service
- Previous routing decisions stored for learning
- Conversation context influences routing
- User feedback on routing quality tracked

## Metrics & Observability

### Key Metrics
- `routing_latency_ms`: Time to make routing decision
- `routing_confidence`: Distribution of confidence scores
- `fallback_rate`: % of queries that fallback to general
- `expert_hit_rate`: % of queries routed to each expert
- `routing_accuracy`: User-reported satisfaction (feedback)

### Tracing
- OpenTelemetry spans for each routing decision
- Trace query from Gateway → Decision Engine → Expert
- Track embedding computation time separately

## Future Enhancements

1. **Dynamic Expert Addition**: Auto-register new experts from deployment
2. **Online Learning**: Update embeddings based on user feedback
3. **Multi-Hop Routing**: Route through intermediate experts for complex queries
4. **Ensemble Routing**: Combine multiple small models for decision
5. **A/B Testing Framework**: Test different routing strategies
6. **Cost-Aware Routing**: Consider expert cost in routing decision

## Implementation Notes for LLM

When implementing this module:
1. Use FastAPI for HTTP server
2. Use `sentence-transformers` for embeddings
3. Store expert profiles in PostgreSQL with pgvector extension
4. Use cosine similarity from pgvector for efficient matching
5. Implement async/await throughout for low latency
6. Add health checks and graceful degradation
7. Follow Hexagonal Architecture pattern (ports/adapters)
8. Separate core logic from infrastructure concerns

## File Structure

```
decision-engine/
  embedding-router/
    ├── app/
    │   ├── __init__.py
    │   ├── main.py              # FastAPI entry point
    │   ├── core/
    │   │   ├── __init__.py
    │   │   ├── models.py        # Pydantic data models
    │   │   ├── embedder.py      # Embedding abstraction
    │   │   ├── router.py        # Routing logic
    │   │   └── registry.py      # Expert registry management
    │   ├── adapters/
    │   │   ├── __init__.py
    │   │   ├── http/            # HTTP routes (primary adapter)
    │   │   ├── persistence/     # DB adapters (postgres, redis)
    │   │   └── embedders/       # Embedding model adapters
    │   └── config.py            # Configuration management
    ├── tests/                   # Test suites
    ├── requirements.txt
    ├── Dockerfile
    └── docs/
        └── SPEC.md              # This file
```
