#!/usr/bin/env python3
"""
Dump EVERYTHING in the CRICPRO SQLite database (read-only).

Run it:   python3 scripts/read_db.py
The `sqlite3` module ships with Python — nothing to install.

It walks every table in the database and prints all of its columns and rows,
so new tables/categories (Fielding Factor, Shot Type, players, balls, …) show up
automatically without changing this script.
"""

import sqlite3
from pathlib import Path

# The database lives in the repo's data/ folder.
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "cricket.sqlite"


def connect() -> sqlite3.Connection:
    """Open read-only (mode=ro) so this can run safely while the app is open."""
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row  # rows behave like dicts: row["name"]
    return conn


def all_tables(conn: sqlite3.Connection) -> list[str]:
    """List every real table from SQLite's catalog (skip internal sqlite_* ones)."""
    rows = conn.execute(
        """
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return [r["name"] for r in rows]


def dump_table(conn: sqlite3.Connection, table: str) -> None:
    """Print every column and every row of one table as a simple aligned grid."""
    # Column names come from PRAGMA table_info (cid, name, type, ...).
    cols = [c["name"] for c in conn.execute(f"PRAGMA table_info({table})")]

    # NOTE: a table name can't be passed as a ? parameter, so we interpolate it —
    # this is safe here because `table` comes from the catalog, not user input.
    rows = conn.execute(f"SELECT * FROM {table}").fetchall()

    print(f"\n=== {table}  ({len(rows)} rows) ===")
    if not rows:
        print("  (empty)")
        return

    # Compute a width per column so the output lines up.
    widths = {c: len(c) for c in cols}
    for row in rows:
        for c in cols:
            widths[c] = max(widths[c], len(str(row[c])))

    def fmt(values):
        return "  ".join(str(v).ljust(widths[c]) for c, v in zip(cols, values))

    print("  " + fmt(cols))                     # header
    print("  " + fmt(["-" * widths[c] for c in cols]))  # underline
    for row in rows:
        print("  " + fmt([row[c] for c in cols]))


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found at {DB_PATH}")

    with connect() as conn:  # `with` auto-closes the connection
        tables = all_tables(conn)
        print(f"Database: {DB_PATH}")
        print(f"{len(tables)} tables: {', '.join(tables)}")
        for table in tables:
            dump_table(conn, table)


if __name__ == "__main__":
    main()
