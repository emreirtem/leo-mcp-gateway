# Proje Takip Dokumani

Bu dosya projedeki ilerlemeyi tek yerden takip etmek icin kullanilir.

## Yapilanlar

- TFS Wiki skillinde temel iyilestirmeler yapildi:
  - HTTP timeout eklendi.
  - URL path guvenli encode (project/wiki identifier) eklendi.
  - `recursionLevel` degeri `Full` olarak duzeltildi.
- Qdrant compose servisinden cikarildi.
- PostgreSQL tabani `pgvector` image ile guncellendi.
- PostgreSQL init scriptleri eklendi:
  - `infra/postgres/init/001_extensions.sql`
  - `infra/postgres/init/002_hybrid_rag.sql`
- Hybrid RAG icin PostgreSQL tarafinda tablo, indeksler ve `search_rag_hybrid(...)` fonksiyonu eklendi.
- Dokumantasyon tarafinda PostgreSQL tabanli hybrid retrieval standardi eklendi.

## Yapilacaklar

- OpenTelemetry gelistirmeleri (tekrar planlanacak):
  - Ortak OTel bootstrap modulu tasarla.
  - Skill seviyesinde span standartlarini belirle.
  - Log-trace korelasyonunu (`trace_id`, `span_id`) uygula.
  - Servis bazli OTel konfig/env standardini belirle.
  - MCP -> Skill -> RAG akisinda uc uca trace dogrulamasi yap.
- Hybrid RAG servis katmani:
  - ETL job'unu `rag_chunks` tablosuna yazacak sekilde bagla.
  - Embedding boyutunu kullanimdaki modele gore netlestir (`vector(N)`).
  - Hybrid arama sonucunda dedup `page_path` listesi donen API katmanini ekle.
  - `sync_id` bazli stale cleanup cron/job'u ekle.
- TFS Wiki entegrasyonu:
  - Gercek Azure DevOps/TFS ortaminda smoke test akisini standardize et.
  - PAT scope ve yetki matrisini dokumante et.
