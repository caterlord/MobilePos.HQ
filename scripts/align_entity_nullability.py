#!/usr/bin/env python3

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path


PROPERTY_PATTERN = re.compile(
    r"^(?P<indent>\s*)public\s+"
    r"(?P<type>[A-Za-z0-9_\.\[\]\?]+)\s+"
    r"(?P<name>\w+)\s*"
    r"\{\s*get;\s*set;\s*\}"
    r"(?P<init>\s*=\s*[^;]+;)?\s*$"
)
ATTRIBUTE_PATTERN = re.compile(r"^\s*\[[^\]]+\]\s*$")
TABLE_PATTERN = re.compile(r'\[Table\("(?P<table>\w+)"\)\]')
CREATE_TABLE_PATTERN = re.compile(
    r"CREATE TABLE \[dbo\]\.\[(?P<table>\w+)\]\((?P<body>.*?)\)\s*ON\s*\[PRIMARY\]",
    re.S,
)
COLUMN_PATTERN = re.compile(
    r"\[(?P<name>\w+)\]\s+\[(?P<sql_type>\w+)\]"
    r"(?:\((?P<size>[^\)]+)\))?\s*"
    r"(?P<identity>IDENTITY\([^\)]*\))?\s*"
    r"(?P<nullability>NOT NULL|NULL)?"
)


@dataclass
class ColumnDefinition:
    name: str
    is_nullable: bool


def parse_schema(schema_path: Path) -> dict[str, dict[str, ColumnDefinition]]:
    schema_content = schema_path.read_text()
    tables: dict[str, dict[str, ColumnDefinition]] = {}

    for match in CREATE_TABLE_PATTERN.finditer(schema_content):
        table_name = match.group("table")
        columns: dict[str, ColumnDefinition] = {}

        for raw_line in match.group("body").splitlines():
            line = raw_line.strip().rstrip(",")
            column_match = COLUMN_PATTERN.match(line)
            if column_match is None:
                continue

            column_name = column_match.group("name")
            nullability = column_match.group("nullability")
            columns[column_name] = ColumnDefinition(
                name=column_name,
                is_nullable=nullability != "NOT NULL",
            )

        tables[table_name] = columns

    return tables


def determine_initializer(base_type: str, db_nullable: bool) -> str:
    if base_type == "string":
        return " = string.Empty;" if not db_nullable else " = null!;"

    if base_type == "byte[]":
        return " = null!;"

    return ""


def rewrite_entity_file(path: Path, table_columns: dict[str, ColumnDefinition]) -> tuple[bool, dict[str, int]]:
    lines = path.read_text().splitlines(keepends=True)
    if not lines:
        return False, {"nullable_fixes": 0, "required_added": 0, "initializers_added": 0, "headers_removed": 0}

    stats = {"nullable_fixes": 0, "required_added": 0, "initializers_added": 0, "headers_removed": 0}

    if lines[0].startswith("#nullable disable"):
        lines = lines[1:]
        if lines and lines[0].strip() == "":
            lines = lines[1:]
        stats["headers_removed"] += 1

    rewritten: list[str] = []
    index = 0

    while index < len(lines):
        attribute_lines: list[str] = []

        while index < len(lines) and ATTRIBUTE_PATTERN.match(lines[index]):
            attribute_lines.append(lines[index])
            index += 1

        if index >= len(lines):
            rewritten.extend(attribute_lines)
            break

        property_match = PROPERTY_PATTERN.match(lines[index])
        if property_match is None:
            rewritten.extend(attribute_lines)
            rewritten.append(lines[index])
            index += 1
            continue

        property_line = lines[index]
        indent = property_match.group("indent")
        property_type = property_match.group("type")
        property_name = property_match.group("name")
        initializer = property_match.group("init") or ""

        column = table_columns.get(property_name)
        if column is None:
            rewritten.extend(attribute_lines)
            rewritten.append(property_line)
            index += 1
            continue

        is_nullable_entity = property_type.endswith("?")
        base_type = property_type[:-1] if is_nullable_entity else property_type
        is_reference_type = base_type in {"string", "byte[]"}
        has_required = any("[Required]" in line for line in attribute_lines)

        if not column.is_nullable and is_nullable_entity:
            property_type = base_type
            is_nullable_entity = False
            stats["nullable_fixes"] += 1

        if not column.is_nullable and base_type == "string" and not has_required:
            attribute_lines.append(f"{indent}[Required]\n")
            has_required = True
            stats["required_added"] += 1

        if not is_nullable_entity and is_reference_type and not initializer:
            initializer = determine_initializer(base_type, column.is_nullable)
            if initializer:
                stats["initializers_added"] += 1

        rewritten.extend(attribute_lines)
        rewritten.append(f"{indent}public {property_type} {property_name} {{ get; set; }}{initializer}\n")
        index += 1

    new_content = "".join(rewritten)
    original_content = path.read_text()
    changed = new_content != original_content
    if changed:
        path.write_text(new_content)

    return changed, stats


def audit_entities(schema_path: Path, entities_dir: Path) -> tuple[int, dict[str, int]]:
    tables = parse_schema(schema_path)
    totals = {"nullable_fixes": 0, "required_added": 0, "initializers_added": 0, "headers_removed": 0}
    changed_files = 0

    for entity_path in sorted(entities_dir.glob("*.cs")):
        content = entity_path.read_text()
        table_match = TABLE_PATTERN.search(content)
        if table_match is None:
            continue

        table_name = table_match.group("table")
        if table_name not in tables:
            continue

        changed, stats = rewrite_entity_file(entity_path, tables[table_name])
        if changed:
            changed_files += 1

        for key, value in stats.items():
            totals[key] += value

    return changed_files, totals


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Align entity nullability with the SQL schema without weakening intentionally stricter nullable columns."
    )
    parser.add_argument(
        "--schema",
        default="docs/db_schema_ewpos_userdata.txt",
        help="Path to the SQL schema file.",
    )
    parser.add_argument(
        "--entities",
        default="backend/EWHQ.Api/Models/Entities",
        help="Path to the entity directory.",
    )
    args = parser.parse_args()

    schema_path = Path(args.schema)
    entities_dir = Path(args.entities)

    changed_files, totals = audit_entities(schema_path, entities_dir)

    print(f"Changed files: {changed_files}")
    print(f"Nullable fixes: {totals['nullable_fixes']}")
    print(f"[Required] added: {totals['required_added']}")
    print(f"Initializers added: {totals['initializers_added']}")
    print(f"Nullable suppression headers removed: {totals['headers_removed']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
