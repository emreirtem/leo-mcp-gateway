# OTel Entegrasyon Analizi (Skill Manager)

Bu dokuman, `skill-manager` icin OpenTelemetry entegrasyon standardini ve uygulanan altyapiyi tarif eder.

## Hedef

- Tum yeni kodlarda dagitik izleme (distributed tracing) varsayilan olmalidir.
- Skill seviyesinde her kritik operasyon (ozellikle dis API cagrilari) span uretmelidir.
- Traceler Jaeger'e OTLP HTTP ile aktarilmalidir.

## Uygulanan Altyapi

- Ortak bootstrap modulu eklendi: `skill-manager/observability/otel.py`
- Tek seferlik init: `init_otel(service_name=...)`
- Tracer erisimi: `get_tracer(__name__)`
- Outbound HTTP otomatik izleme: `RequestsInstrumentor().instrument()`

## TFS Wiki Skill Kapsami

Asagidaki operasyonlar manuel span ile izlencek sekilde instrument edildi:

- `tfs.get_projects`
- `tfs.get_wikis`
- `tfs.get_wiki_pages_tree`
- `tfs.get_page`

Span attribute ornekleri:

- `tfs.project`
- `tfs.wiki_identifier`
- `tfs.page_path`
- `tfs.api_version`
- `http.status_code`

Hata durumunda:

- `span.record_exception(e)`
- `span.set_status(Status(StatusCode.ERROR, ...))`

## Ortam Degiskenleri

`.env` veya deployment ortaminda:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
ENVIRONMENT=development
SERVICE_VERSION=0.1.0
```

## Gelistirme Kurali

Yeni bir modulde endpoint, adapter veya worker ekleniyorsa:

1. OTel bootstrap surecin basinda initialize edilmeli.
2. Kritik use-case akislari manuel span ile sarilmali.
3. Hata durumlari span status `ERROR` olarak isaretlenmeli.
4. Skill dokumani altinda izlenen operasyonlar acikca belirtilmeli.
