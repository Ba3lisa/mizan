#!/usr/bin/env python3
"""
generate_reference_data.py — regenerate convex/data/referenceRecords.ts from JSONL backups.

Usage:
    python3 scripts/generate_reference_data.py [--data-dir /tmp/mizan-backup]

By default, reads JSONL files from convex/data/*.jsonl (already copied there).
Outputs convex/data/referenceRecords.ts (and app/convex/data/referenceRecords.ts).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "convex" / "data"
APP_DATA_DIR = ROOT / "app" / "convex" / "data"

TABLES = [
    "officials",
    "governorates",
    "parties",
    "constitutionParts",
    "constitutionArticles",
    "articleCrossReferences",
    "elections",
    "electionResults",
    "governorateElectionData",
    "committees",
    "committeeMemberships",
    "dataSources",
    "ministries",
    "parliamentMembers",
    "budgetItems",
    "debtByCreditor",
    "debtRecords",
    "fiscalYears",
]


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def esc_str(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
    )


def to_ts(v: object) -> str:
    if v is None:
        return "undefined"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        if v == int(v):
            return str(int(v))
        return repr(v)
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        return f'"{esc_str(v)}"'
    if isinstance(v, list):
        if not v:
            return "[]"
        return "[" + ", ".join(to_ts(x) for x in v) + "]"
    if isinstance(v, dict):
        if not v:
            return "{}"
        parts = [f"{k}: {to_ts(val)}" for k, val in v.items()]
        return "{" + ", ".join(parts) + "}"
    return str(v)


def format_record_with_backupid(old_id: str, doc: dict, indent: int = 2) -> str:
    pad = "  " * indent
    inner = "  " * (indent + 1)
    parts = [f"{inner}_backupId: \"{old_id}\""]
    for k, v in doc.items():
        if v is None:
            continue
        parts.append(f"{inner}{k}: {to_ts(v)}")
    return "{\n" + ",\n".join(parts) + f",\n{pad}}}"


def format_array(name: str, rows: list[dict], indent: int = 1) -> str:
    pad = "  " * indent
    items = []
    for row in rows:
        old_id = row["_id"]
        doc = {k: v for k, v in row.items() if not k.startswith("_")}
        items.append(format_record_with_backupid(old_id, doc, indent))
    joined = (",\n" + pad).join(items)
    return (
        f"export const ref_{name}: Array<WithBackupId<Record<string, unknown>>> = [\n"
        f"{pad}{joined}\n"
        f"];\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-dir",
        default=str(DATA_DIR),
        help="Directory containing *.jsonl files (default: convex/data/)",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"ERROR: data directory not found: {data_dir}", file=sys.stderr)
        sys.exit(1)

    output_lines = [
        "// AUTO-GENERATED — DO NOT EDIT MANUALLY",
        "// Run scripts/generate_reference_data.py to regenerate",
        "// Source: convex/data/*.jsonl (copied from backup)",
        "",
        "export type WithBackupId<T> = T & { _backupId: string };",
        "",
    ]

    for table in TABLES:
        jsonl_path = data_dir / f"{table}.jsonl"
        if not jsonl_path.exists():
            print(f"WARNING: {jsonl_path} not found — skipping {table}", file=sys.stderr)
            output_lines.append(
                f"export const ref_{table}: Array<WithBackupId<Record<string, unknown>>> = [];"
            )
            output_lines.append("")
            continue

        rows = load_jsonl(jsonl_path)
        output_lines.append(format_array(table, rows))
        print(f"  {table}: {len(rows)} records")

    content = "\n".join(output_lines)

    # Write to both locations
    for out_dir in [DATA_DIR, APP_DATA_DIR]:
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "referenceRecords.ts"
        out_path.write_text(content)
        print(f"Written: {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
