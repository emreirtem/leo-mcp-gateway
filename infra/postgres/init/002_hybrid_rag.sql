CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS rag_chunks (
    chunk_id TEXT PRIMARY KEY,
    project TEXT NOT NULL,
    wiki_identifier TEXT NOT NULL,
    page_path TEXT NOT NULL,
    heading_path TEXT,
    chunk_text TEXT NOT NULL,
    -- Adjust dimension to your embedding model output size.
    embedding VECTOR(1536) NOT NULL,
    sync_id TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(project, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(wiki_identifier, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(page_path, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(heading_path, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(chunk_text, '')), 'D')
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_tsv_gin ON rag_chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_scope ON rag_chunks (project, wiki_identifier, sync_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_ivfflat ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION search_rag_hybrid(
    in_query TEXT,
    in_query_embedding VECTOR(1536),
    in_project TEXT DEFAULT NULL,
    in_wiki_identifier TEXT DEFAULT NULL,
    in_sync_id TEXT DEFAULT NULL,
    in_top_k INTEGER DEFAULT 10,
    in_rrf_k INTEGER DEFAULT 60
)
RETURNS TABLE (
    chunk_id TEXT,
    project TEXT,
    wiki_identifier TEXT,
    page_path TEXT,
    heading_path TEXT,
    chunk_text TEXT,
    lexical_score DOUBLE PRECISION,
    vector_score DOUBLE PRECISION,
    fused_score DOUBLE PRECISION
)
LANGUAGE sql
AS $$
WITH q AS (
    SELECT websearch_to_tsquery('simple', in_query) AS tsq
),
lexical_candidates AS (
    SELECT
        c.chunk_id,
        c.project,
        c.wiki_identifier,
        c.page_path,
        c.heading_path,
        c.chunk_text,
        ts_rank_cd(c.tsv, q.tsq) AS lexical_score,
        row_number() OVER (ORDER BY ts_rank_cd(c.tsv, q.tsq) DESC, c.updated_at DESC) AS lexical_rank
    FROM rag_chunks c
    CROSS JOIN q
    WHERE c.tsv @@ q.tsq
      AND (in_project IS NULL OR c.project = in_project)
      AND (in_wiki_identifier IS NULL OR c.wiki_identifier = in_wiki_identifier)
      AND (in_sync_id IS NULL OR c.sync_id = in_sync_id)
    ORDER BY lexical_score DESC, c.updated_at DESC
    LIMIT GREATEST(in_top_k * 5, 50)
),
vector_candidates AS (
    SELECT
        c.chunk_id,
        c.project,
        c.wiki_identifier,
        c.page_path,
        c.heading_path,
        c.chunk_text,
        (1 - (c.embedding <=> in_query_embedding))::DOUBLE PRECISION AS vector_score,
        row_number() OVER (ORDER BY c.embedding <=> in_query_embedding, c.updated_at DESC) AS vector_rank
    FROM rag_chunks c
    WHERE (in_project IS NULL OR c.project = in_project)
      AND (in_wiki_identifier IS NULL OR c.wiki_identifier = in_wiki_identifier)
      AND (in_sync_id IS NULL OR c.sync_id = in_sync_id)
    ORDER BY c.embedding <=> in_query_embedding, c.updated_at DESC
    LIMIT GREATEST(in_top_k * 5, 50)
),
fused AS (
    SELECT
        COALESCE(l.chunk_id, v.chunk_id) AS chunk_id,
        COALESCE(l.project, v.project) AS project,
        COALESCE(l.wiki_identifier, v.wiki_identifier) AS wiki_identifier,
        COALESCE(l.page_path, v.page_path) AS page_path,
        COALESCE(l.heading_path, v.heading_path) AS heading_path,
        COALESCE(l.chunk_text, v.chunk_text) AS chunk_text,
        COALESCE(l.lexical_score, 0)::DOUBLE PRECISION AS lexical_score,
        COALESCE(v.vector_score, 0)::DOUBLE PRECISION AS vector_score,
        (COALESCE(1.0 / (in_rrf_k + l.lexical_rank), 0) + COALESCE(1.0 / (in_rrf_k + v.vector_rank), 0))::DOUBLE PRECISION AS fused_score
    FROM lexical_candidates l
    FULL OUTER JOIN vector_candidates v ON l.chunk_id = v.chunk_id
)
SELECT
    f.chunk_id,
    f.project,
    f.wiki_identifier,
    f.page_path,
    f.heading_path,
    f.chunk_text,
    f.lexical_score,
    f.vector_score,
    f.fused_score
FROM fused f
ORDER BY f.fused_score DESC, f.vector_score DESC, f.lexical_score DESC
LIMIT in_top_k;
$$;
