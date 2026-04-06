# TFS Wiki Skill

**Path:** `skill-manager/tfs_wiki`

This module provides the necessary abilities to interact with an on-premise TFS (Azure DevOps Server) or cloud Azure DevOps Services to read Wiki pages.

## Capabilities

The skill offers 4 main integration points for Agents and ETL systems:

1. **List Projects (`list_tfs_projects()`)**
   - Fetches all available projects within the configured TFS Collection.
   - Useful for discovering which projects are available for scanning.

2. **List Wikis (`list_tfs_wikis(project)`)**
   - Fetches the Wiki repositories associated with a specific project. Note that one project can have a global wiki and Multiple team wikis (e.g. `MyProject.wiki`).

3. **Traverse Wiki Pages (`list_tfs_wiki_paths(project, wiki_identifier)`)**
   - Retrieves the full tree/hierarchy of pages inside a specific Wiki.
   - Returns a flat list of `page_path` strings (e.g., `/Architecture`, `/Architecture/Overview`) by recursively traversing the nodes.
   - Designed to feed into an ETL Queue or a crawler loop.

4. **Read Page Content (`read_tfs_wiki_page(project, wiki_identifier, page_path)`)**
   - Fetches the raw Markdown content of a specific page path.

## Configuration

Requires the following environment variables in your main `.env` file:
```env
TFS_BASE_URL=http://your-tfs-server:8080/tfs
TFS_COLLECTION=DefaultCollection
TFS_PAT=your_personal_access_token
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
ENVIRONMENT=development
SERVICE_VERSION=0.1.0
```

## OpenTelemetry

This skill is instrumented with OpenTelemetry and exports traces over OTLP HTTP.

- Bootstrap location: `skill-manager/observability/otel.py`
- Traced operations:
  - `tfs.get_projects`
  - `tfs.get_wikis`
  - `tfs.get_wiki_pages_tree`
  - `tfs.get_page`
- Requests-based outbound HTTP calls are auto-instrumented.

## How to Test

You can manually debug and test this skill from the CLI using the proxy `main.py` entrypoint located at `skill-manager/main.py`:

```bash
# List all projects
python main.py projects

# List wikis in a project
python main.py wikis "E-Commerce"

# Traverse all page paths
python main.py tree "E-Commerce" "E-Commerce.wiki"

# Read specific markdown content
python main.py read "E-Commerce" "E-Commerce.wiki" "/Development/Setup"
```
