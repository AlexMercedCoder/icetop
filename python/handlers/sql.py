"""
SQL handler — executes SQL via Polars SQL context.

Polars has a built-in SQL engine that's simpler than DataFusion for our
use case. We read Iceberg tables into Polars DataFrames, register them
in a Polars SQLContext, then execute SQL directly.
"""
import re
import sys
import time
import polars as pl
from handlers.iceframe_loader import get_iceframe


class SQLHandler:
    def __init__(self):
        self._history: list[dict] = []

    @staticmethod
    def _strip_catalog_prefix(query: str, catalog: str) -> str:
        """Strip catalog prefix from table references in SQL."""
        pattern = re.compile(
            r'\b' + re.escape(catalog) + r'\.([\w][\w.]*)',
            re.IGNORECASE
        )
        return pattern.sub(r'\1', query)

    @staticmethod
    def _extract_table_refs(sql: str) -> list[str]:
        """Extract table references from SQL (after FROM and JOIN)."""
        pattern = re.compile(
            r'(?:FROM|JOIN)\s+([\w]+(?:\.[\w]+)*)',
            re.IGNORECASE
        )
        return list(set(pattern.findall(sql)))

    @staticmethod
    def _make_alias(ref: str) -> str:
        """Convert dotted table ref to a flat alias."""
        return ref.replace(".", "__")

    def execute(self, params: dict) -> dict:
        catalog = params["catalog"]
        query = params["query"]
        ice = get_iceframe(catalog)

        # Step 1: Strip catalog prefix
        cleaned_query = self._strip_catalog_prefix(query, catalog)
        print(f"[SQL] Cleaned query: {cleaned_query}", file=sys.stderr)

        # Step 2: Extract table references
        table_refs = self._extract_table_refs(cleaned_query)
        print(f"[SQL] Extracted table refs: {table_refs}", file=sys.stderr)

        start = time.time()

        if table_refs:
            # Use Polars SQL context instead of DataFusion
            ctx = pl.SQLContext()

            # Step 3: Read each table and register with flat alias
            alias_map = {}
            for ref in table_refs:
                alias = self._make_alias(ref)
                alias_map[ref] = alias
                print(f"[SQL] Loading table '{ref}' as '{alias}'", file=sys.stderr)
                try:
                    tbl_df = ice.read_table(ref)
                    ctx.register(alias, tbl_df.lazy())
                    print(f"[SQL] Registered '{alias}' ({tbl_df.height} rows, {len(tbl_df.columns)} cols)", file=sys.stderr)
                except Exception as e:
                    print(f"[SQL] ERROR loading '{ref}': {e}", file=sys.stderr)
                    raise RuntimeError(f"Could not load table '{ref}': {e}")

            # Step 4: Rewrite SQL to use flat aliases
            rewritten_sql = cleaned_query
            for ref in sorted(alias_map.keys(), key=len, reverse=True):
                rewritten_sql = re.sub(
                    r'\b' + re.escape(ref) + r'\b',
                    alias_map[ref],
                    rewritten_sql
                )
            print(f"[SQL] Rewritten: {rewritten_sql}", file=sys.stderr)

            # Step 5: Execute via Polars SQL context
            result_lf = ctx.execute(rewritten_sql)
            df = result_lf.collect()
        else:
            # No table refs (e.g. SELECT 1+1), try DataFusion directly
            df = ice.query_datafusion(cleaned_query)

        elapsed_ms = int((time.time() - start) * 1000)
        print(f"[SQL] Done in {elapsed_ms}ms, {df.height} rows", file=sys.stderr)

        rows = df.to_dicts()
        columns = [
            {"name": col, "type": str(df.schema[col])}
            for col in df.columns
        ]

        result = {
            "columns": columns,
            "rows": rows,
            "rowCount": len(rows),
            "executionTimeMs": elapsed_ms,
        }

        self._history.insert(0, {
            "query": query,
            "catalog": catalog,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "rowCount": len(rows),
            "executionTimeMs": elapsed_ms,
            "error": None,
        })
        self._history = self._history[:100]

        return result

    def get_history(self, params: dict) -> list[dict]:
        return self._history
