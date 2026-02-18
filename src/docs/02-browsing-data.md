# Browsing Data

The Sidebar provides a hierarchical view of your Iceberg catalogs.

## Navigation

- **Catalogs**: Top-level items defined in your `~/.pyiceberg.yaml`.
- **Namespaces**: Schemas or databases within a catalog. Supports nested namespaces.
- **Tables**: Iceberg tables.

## Metadata Inspector

Click on any table in the sidebar to open the **Metadata** tab.

### Available Views
- **Schema**: Column names, types, and documentation.
- **Partitions**: Partition transforms (e.g., `day(ts)`, `bucket(id, 16)`).
- **Properties**: Table properties (compression, expiration settings, etc).
- **Snapshots**: History of table commits, including timestamp, operation (append/overwrite), and summary stats.

## Drag and Drop

You can drag a table from the sidebar and drop it into:
- **SQL Editor**: Inserts the table name (e.g., `SELECT * FROM "sandbox.test_table"`).
- **Notebook**: Inserts a code snippet to load the table into a dataframe.
- **Chat**: Provides context to the AI about the table.

## Searching

Use the filter bar at the top of the sidebar to quickly find tables by name. The tree will auto-expand to show matching items.
