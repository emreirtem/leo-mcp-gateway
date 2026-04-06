# Hybrid RAG Analizi (TFS Wiki)

Bu projede TFS Wiki kaynaklari icin retrieval katmani hibrit olacak:

- Semantic retrieval: PostgreSQL `pgvector`
- Lexical retrieval: PostgreSQL FTS/BM25 (`tsvector`, `websearch_to_tsquery`, `ts_rank_cd`)

### Neden PostgreSQL tek katman?

- Operasyonel sadelik (tek datastore)
- ETL ve metadata yonetiminde kolaylik
- Citation ve source-page donusu icin dogrudan SQL ile grouping

### Zorunlu chunk metadata

- `chunk_id`
- `project`
- `wiki_identifier`
- `page_path`
- `sync_id`
- `updated_at`

### Sorgu modeli

1. Vector top-k getir
2. FTS/BM25 top-k getir
3. Sonuclari RRF benzeri fusion ile birlestir
4. Hem chunk listesini hem de `page_path` bazli tekillestirilmis kaynak listesini don

### Implementasyon (PostgreSQL icinde)

- Init SQL: `infra/postgres/init/002_hybrid_rag.sql`
- Tablo: `rag_chunks`
  - `embedding vector(1536)` (model boyutuna gore degistirilebilir)
  - `tsv` generated column (FTS icin agirlikli alanlar)
- Indeksler:
  - `GIN` on `tsv`
  - `ivfflat` on `embedding` (`vector_cosine_ops`)
  - scope index: `(project, wiki_identifier, sync_id)`
- Arama fonksiyonu:
  - `search_rag_hybrid(...)`
  - lexical (`websearch_to_tsquery` + `ts_rank_cd`) + vector (`<=>`) adaylarini alir
  - RRF benzeri birlesim ile `fused_score` hesaplayip `top_k` dondurur
