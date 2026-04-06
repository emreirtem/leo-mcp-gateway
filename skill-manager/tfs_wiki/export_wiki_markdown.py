import argparse
from pathlib import Path

from reader import TFSWikiReader


def _path_to_file_path(page_path: str, output_dir: Path) -> Path:
    clean = page_path.strip("/")
    if not clean:
        return output_dir / "_root.md"
    return output_dir / f"{clean}.md"


def export_wiki(project: str, wiki_identifier: str, output_dir: Path) -> None:
    reader = TFSWikiReader()

    tree_result = reader.get_wiki_pages_tree(project=project, wiki_identifier=wiki_identifier)
    if not tree_result.get("success"):
        raise RuntimeError(f"Tree fetch failed: {tree_result.get('error')}")

    def extract_paths(node: dict) -> list[str]:
        paths: list[str] = []
        if "path" in node:
            paths.append(node["path"])
        for sub_page in node.get("subPages", []):
            paths.extend(extract_paths(sub_page))
        return paths

    paths = extract_paths(tree_result.get("pages_tree", {}))
    if not paths:
        print("No wiki paths found.")
        return

    output_dir.mkdir(parents=True, exist_ok=True)
    exported = 0
    failed = 0

    for page_path in paths:
        page_result = reader.get_page(
            project=project,
            wiki_identifier=wiki_identifier,
            page_path=page_path,
        )

        if not page_result.get("success"):
            failed += 1
            print(f"[FAIL] {page_path} -> {page_result.get('error')}")
            continue

        content = page_result.get("content", "")
        target_file = _path_to_file_path(page_path, output_dir)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(content, encoding="utf-8")
        exported += 1
        print(f"[OK] {page_path} -> {target_file}")

    summary = (
        f"# Export Summary\n\n"
        f"- Project: `{project}`\n"
        f"- Wiki: `{wiki_identifier}`\n"
        f"- Total paths: `{len(paths)}`\n"
        f"- Exported: `{exported}`\n"
        f"- Failed: `{failed}`\n"
    )
    (output_dir / "_summary.md").write_text(summary, encoding="utf-8")
    print(f"\nDone. Summary written to: {output_dir / '_summary.md'}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export all pages from a TFS/Azure DevOps wiki into markdown files."
    )
    parser.add_argument("project", help="TFS project name")
    parser.add_argument("wiki_identifier", help="Wiki identifier/name")
    parser.add_argument(
        "--output-dir",
        default="wiki_exports",
        help="Output directory for exported markdown files (default: wiki_exports)",
    )
    args = parser.parse_args()

    export_wiki(
        project=args.project,
        wiki_identifier=args.wiki_identifier,
        output_dir=Path(args.output_dir),
    )


if __name__ == "__main__":
    main()
