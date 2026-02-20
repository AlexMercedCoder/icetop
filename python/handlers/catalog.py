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

        # Inject additional structural properties
        try:
            if hasattr(tbl, "format_version"):
                properties["format-version"] = str(tbl.format_version)
            elif hasattr(tbl, "metadata") and hasattr(tbl.metadata, "format_version"):
                properties["format-version"] = str(tbl.metadata.format_version)

            if hasattr(tbl, "sort_order"):
                so = tbl.sort_order()
                if so and hasattr(so, "fields") and so.fields:
                    sort_strs = []
                    schema = tbl.schema() if hasattr(tbl, "schema") else None
                    for f in so.fields:
                        col_name = str(f.source_id)
                        if schema:
                            try:
                                col_name = schema.find_column_name(f.source_id) or col_name
                            except Exception:
                                pass
                        
                        dir_str = "ASC" if "ASC" in str(f.direction) else "DESC"
                        null_str = "NULLS FIRST" if "FIRST" in str(f.null_order) else "NULLS LAST"
                        sort_strs.append(f"{col_name} {dir_str} {null_str}")
                    properties["sort-order"] = ", ".join(sort_strs)
                
            if hasattr(tbl, "current_snapshot"):
                snap = tbl.current_snapshot()
                if snap:
                    properties["current-snapshot-id"] = str(snap.snapshot_id)
            
            if "format" not in properties:
                properties["format"] = "iceberg/parquet"
        except Exception:
            pass

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

    def get_files(self, params: dict) -> list[dict]:
        """Get data files for a table."""
        catalog = params["catalog"]
        table = params["table"]
        ice = get_iceframe(catalog)
        try:
            tbl = ice.catalog.load_table(tuple(table.split(".")))
            if hasattr(tbl, "inspect") and hasattr(tbl.inspect, "data_files"):
                df = tbl.inspect.data_files()
                if hasattr(df, "to_pandas"):
                    df = df.to_pandas()
                
                # Extract relevant fields
                files = []
                # df is a pandas DataFrame, we can iterate over records
                for record in df.to_dict(orient="records"):
                    raw_part = record.get("partition", {})
                    part_dict = {}
                    if isinstance(raw_part, dict):
                        for k, v in raw_part.items():
                            part_dict[str(k)] = str(v)
                            
                    files.append({
                        "file_path": str(record.get("file_path", "")),
                        "file_format": str(record.get("file_format", "")),
                        "record_count": int(record.get("record_count", 0)),
                        "file_size_in_bytes": int(record.get("file_size_in_bytes", 0)),
                        "partition": part_dict
                    })
                return files
        except Exception as e:
            print(f"Error fetching files for {table}: {e}")
            pass
        return []
