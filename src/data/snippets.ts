export interface Snippet {
  id: string;
  title: string;
  description: string;
  category: 'Query' | 'Table Management' | 'Maintenance';
  code: string;
}

export const snippets: Snippet[] = [
  // ── Query ──────────────────────────────────────────
  {
    id: 'read-table',
    title: 'Read Table Data',
    description: 'Read an Iceberg table into a Polars DataFrame',
    category: 'Query',
    code: `# Read an Iceberg table into a Polars DataFrame
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_table"

df = ice.read_table(table_name)
print(df)`,
  },
  {
    id: 'query-metadata',
    title: 'Query Table Metadata',
    description: 'Inspect schema, partitioning, and properties of a table',
    category: 'Query',
    code: `# Get table metadata (schema, partitioning, properties)
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_table"

table = ice.get_table(table_name)
print("Schema:")
print(table.schema())
print("\\nPartition Spec:")
print(table.spec())
print("\\nProperties:")
print(table.properties)`,
  },
  {
    id: 'table-stats',
    title: 'Table Statistics',
    description: 'Get row count, file count, and size information',
    category: 'Query',
    code: `# Get statistics for an Iceberg table
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_table"

stats = ice.stats(table_name)
print(stats)`,
  },
  {
    id: 'list-namespaces',
    title: 'List Namespaces',
    description: 'List all namespaces in the catalog',
    category: 'Query',
    code: `# List all namespaces in the connected catalog
# The 'ice' object is pre-connected to the active catalog

namespaces = ice.list_namespaces()
for ns in namespaces:
    print(ns)`,
  },
  {
    id: 'list-tables',
    title: 'List Tables in Namespace',
    description: 'List all tables in a specific namespace',
    category: 'Query',
    code: `# List all tables in a namespace
# The 'ice' object is pre-connected to the active catalog

namespace = "my_namespace"

tables = ice.list_tables(namespace)
for t in tables:
    print(t)`,
  },

  // ── Table Management ───────────────────────────────
  {
    id: 'create-table',
    title: 'Create a New Table',
    description: 'Create an Iceberg table from a Polars DataFrame',
    category: 'Table Management',
    code: `# Create a new Iceberg table from a Polars DataFrame
# The 'ice' object is pre-connected to the active catalog
import polars as pl

table_name = "my_namespace.my_new_table"

# Define your data
df = pl.DataFrame({
    "id": [1, 2, 3],
    "name": ["Alice", "Bob", "Charlie"],
    "value": [10.5, 20.3, 30.1],
})

ice.create_table(table_name, df)
print(f"Table '{table_name}' created successfully.")`,
  },
  {
    id: 'upload-csv',
    title: 'Upload CSV to New Table',
    description: 'Create a table from a local CSV file',
    category: 'Table Management',
    code: `# Create a new Iceberg table from a local CSV file
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_csv_table"
file_path = "/path/to/your/data.csv"

ice.create_table_from_csv(table_name, file_path)
print(f"Table '{table_name}' created from CSV.")`,
  },
  {
    id: 'upload-json',
    title: 'Upload JSON to New Table',
    description: 'Create a table from a local JSON file',
    category: 'Table Management',
    code: `# Create a new Iceberg table from a local JSON file
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_json_table"
file_path = "/path/to/your/data.json"

ice.create_table_from_json(table_name, file_path)
print(f"Table '{table_name}' created from JSON.")`,
  },
  {
    id: 'upload-parquet',
    title: 'Upload Parquet to New Table',
    description: 'Create a table from a local Parquet file',
    category: 'Table Management',
    code: `# Create a new Iceberg table from a local Parquet file
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_parquet_table"
file_path = "/path/to/your/data.parquet"

ice.create_table_from_parquet(table_name, file_path)
print(f"Table '{table_name}' created from Parquet.")`,
  },
  {
    id: 'append-data',
    title: 'Append Data to Table',
    description: 'Append rows to an existing Iceberg table',
    category: 'Table Management',
    code: `# Append data to an existing Iceberg table
# The 'ice' object is pre-connected to the active catalog
import polars as pl

table_name = "my_namespace.my_table"

# New rows to append
new_data = pl.DataFrame({
    "id": [4, 5],
    "name": ["Diana", "Eve"],
    "value": [40.0, 50.0],
})

ice.append_to_table(table_name, new_data)
print(f"Data appended to '{table_name}' successfully.")`,
  },

  // ── Maintenance ────────────────────────────────────
  {
    id: 'rollback-snapshot',
    title: 'Rollback Table to Snapshot',
    description: 'Revert a table to a specific snapshot ID',
    category: 'Maintenance',
    code: `# Rollback an Iceberg table to a previous snapshot
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_table"

# First, list snapshots to find the target
table = ice.get_table(table_name)
for snapshot in table.history():
    print(f"Snapshot ID: {snapshot.snapshot_id}, Timestamp: {snapshot.timestamp_ms}")

# Then rollback to a specific snapshot ID
snapshot_id = 123456789  # Replace with actual snapshot ID
ice.rollback_to_snapshot(table_name, snapshot_id)
print(f"Table '{table_name}' rolled back to snapshot {snapshot_id}.")`,
  },
  {
    id: 'compact-data',
    title: 'Run Compaction',
    description: 'Compact small data files to improve query performance',
    category: 'Maintenance',
    code: `# Compact data files for an Iceberg table
# This merges small files to improve read performance
# The 'ice' object is pre-connected to the active catalog

table_name = "my_namespace.my_table"

ice.compact_data_files(table_name)
print(f"Compaction completed for '{table_name}'.")`,
  },
  {
    id: 'expire-snapshots',
    title: 'Expire Snapshots',
    description: 'Remove old snapshots to free up storage',
    category: 'Maintenance',
    code: `# Expire old snapshots to free up storage
# The 'ice' object is pre-connected to the active catalog
from datetime import datetime, timedelta

table_name = "my_namespace.my_table"

# Expire snapshots older than 7 days
older_than = datetime.now() - timedelta(days=7)

ice.expire_snapshots(table_name, older_than=older_than)
print(f"Old snapshots expired for '{table_name}'.")`,
  },
];
