"""
Catalog handler — wraps IceFrame catalog operations.
"""
from handlers.iceframe_loader import get_iceframe, list_catalog_names


class CatalogHandler:
    def list_catalogs(self, params: dict) -> list[str]:
        """Return catalog names from pyiceberg.yaml."""
        return list_catalog_names()

    def list_namespaces(self, params: dict) -> list[str]:
        catalog = params["catalog"]
        ice = get_iceframe(catalog)
        namespaces = ice.list_namespaces()
        return [".".join(ns) if isinstance(ns, (tuple, list)) else str(ns) for ns in namespaces]

    def list_tables(self, params: dict) -> list[str]:
        catalog = params["catalog"]
        namespace = params["namespace"]
        ice = get_iceframe(catalog)
        tables = ice.list_tables(namespace)
        return self._parse_table_names(tables)

    def list_children(self, params: dict) -> dict:
        """List both sub-namespaces and tables under a namespace.
        Iceberg catalogs support hierarchical namespaces (e.g. db.schema.table).
        """
        catalog = params["catalog"]
        namespace = params["namespace"]
        ice = get_iceframe(catalog)

        # Get sub-namespaces
        sub_namespaces = []
        try:
            children_ns = ice.list_namespaces(namespace)
            for ns in children_ns:
                if isinstance(ns, (tuple, list)):
                    # Return only the leaf name (last element)
                    sub_namespaces.append(ns[-1])
                else:
                    name = str(ns)
                    # Strip parent prefix if present
                    if name.startswith(namespace + "."):
                        name = name[len(namespace) + 1:]
                    sub_namespaces.append(name)
        except Exception:
            pass  # Some catalogs don't support nested namespaces

        # Get tables
        tables = []
        try:
            raw_tables = ice.list_tables(namespace)
            tables = self._parse_table_names(raw_tables)
        except Exception:
            pass

        return {"namespaces": sub_namespaces, "tables": tables}

    @staticmethod
    def _parse_table_names(tables) -> list[str]:
        result = []
        for t in tables:
            if isinstance(t, (tuple, list)):
                result.append(t[-1])
            elif isinstance(t, str):
                if t.startswith("(") and t.endswith(")"):
                    parts = t.strip("()").split(",")
                    name = parts[-1].strip().strip("'\"")
                    result.append(name)
                else:
                    result.append(t)
            else:
                result.append(str(t))
        return result

    def describe_table(self, params: dict) -> dict:
        catalog = params["catalog"]
        table = params["table"]
        ice = get_iceframe(catalog)
        # Use the PyIceberg catalog directly to avoid IceFrame tuple issues
        tbl = ice.catalog.load_table(tuple(table.split(".")))
        schema = tbl.schema()
        columns = [
            {
                "name": field.name,
                "type": str(field.field_type),
                "required": field.required,
                "doc": field.doc,
            }
            for field in schema.fields
        ]
        partition_spec = [str(field) for field in tbl.spec().fields] if tbl.spec() else []
        properties = dict(tbl.properties) if hasattr(tbl, "properties") else {}

        # Include snapshots in the same response (same table object, no second load)
        snapshots = []
        try:
            if hasattr(tbl, "metadata") and tbl.metadata and hasattr(tbl.metadata, "snapshots") and tbl.metadata.snapshots:
                for snap in tbl.metadata.snapshots:
                    # Extract summary without dict() — PyIceberg's Summary.__getitem__
                    # only accepts strings, so dict() fails with tuple keys
                    summary_dict = {}
                    if snap.summary:
                        try:
                            # Try Pydantic v2 model_dump first
                            raw = snap.summary.model_dump() if hasattr(snap.summary, "model_dump") else snap.summary.dict()
                            summary_dict = {k: str(v) for k, v in raw.items() if k != "operation"}
                        except Exception:
                            # Fallback: extract known fields manually
                            summary_dict = {}

                    snapshots.append({
                        "snapshotId": str(snap.snapshot_id),
                        "timestamp": str(snap.timestamp_ms),
                        "operation": snap.summary.operation.value if snap.summary and hasattr(snap.summary.operation, "value") else str(snap.summary.operation) if snap.summary else "unknown",
                        "summary": summary_dict,
                    })
        except Exception:
            pass  # Snapshots not available for this catalog type

        return {
            "columns": columns,
            "partitionSpec": partition_spec,
            "properties": properties,
            "snapshots": snapshots,
        }

    def get_snapshots(self, params: dict) -> list[dict]:
        """Legacy endpoint — now included in describe_table response."""
        result = self.describe_table(params)
        return result.get("snapshots", [])
