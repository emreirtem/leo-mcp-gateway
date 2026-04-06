# 🦁 LEO Project: Agentic OS Infrastructure

Leo is a highly modular, event-driven Agentic Operating System infrastructure that seamlessly merges the Python and Node.js ecosystems. Built on top of the **Model Context Protocol (MCP)**, this architecture is designed to orchestrate an autonomous "Agent Team" capable of coding, reviewing, and managing organizational knowledge safely and efficiently.

## 🏗️ Architecture Design
The project strictly enforces a **Hexagonal Architecture (Ports & Adapters)** across all microservices. Every module respects the Dependency Rule—core logic never imports external dependencies directly.

### Core Principles
- **Protocol Agnosticism:** Microservices communicate fluidly via dynamic `REST` or `gRPC` adapters.
- **Contract-First Development:** Centralized `.proto` and JSON schemas in the `/contracts` directory govern all inter-service communications.
- **True Isolation:** Every module scales independently in isolated Docker containers.
- **Zero-Test Policy (Production First):** The current development lifecycle heavily prioritizes shipping production code, bypassing boilerplate test files.

## 📦 Microservices Ecosystem

The repository represents a polyglot monorepo containing the following 6 core modules:

| Modül | Dil | Sorumluluk |
| --- | --- | --- |
| 🛡️ **MCP Gateway** | TS / Node.js | Harici LLM'ler için giriş kapısı (MCP Protocol). Kimlik doğrulama, JWT/API-Key kontrolü ve yönlendirme. |
| 🛠️ **Skill Manager** | Python | Ajan yeteneklerinin (Tools/Skills) orkestratörü. Güvenli sandbox Terminal çalıştırmaları. |
| 🔄 **ETL & RAG Engine** | TS / Node.js | BullMQ ile desteklenen kesintisiz veri çekme (ingestion) ve RAG vektörleştirme kuyruğu (Worker). |
| 🧠 **Memory Service** | TS / Node.js | Ajanların kısa/uzun vadeli hafızası (Postgres & Redis). Universal Memory API (IMemoryProvider). |
| 🎯 **Vector Service** | Python | PostgreSQL `pgvector` üzerinde vektör indeks yönetimi ve Embedding modellerinin (HuggingFace, OpenAI) adaptörleri. |
| 🚦 **Decision Engine** | Python | Küçük Dil Modelleri (SLM / Llama.cpp) ile düşük gecikmeli Intent Classification (Niyet okuyucu yönlendirici). |

## 🛡️ Security & Observability
- **Security:** Strict separation between external callers and internal services. All internal traffic requires valid context validation; external sessions run behind JWT/API keys at the Gateway.
- **Observability:** Centralized JSON structured logging across the entire infrastructure using `pino` (Node.js) and equivalent structural handlers in Python.
- **Distributed Tracing:** 100% instrumentation with the **OpenTelemetry (OTel)** SDK. All traffic paths from the Gateway gateway to the depth of the Python DB are traceable in **Jaeger**.

## 🚀 Getting Started

*Note: Ensure Docker and Docker Compose are installed on your machine.*

```bash
# Clone the repository
git clone https://github.com/your-username/leo-mcp-gateway.git
cd leo-mcp-gateway

# Contracts Generation (Optional/Needed if modifying protos)
cd contracts && ./generate_contracts.sh
```

*(More specific compose and deployment instructions will be provided as development progresses).*
