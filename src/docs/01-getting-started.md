# Getting Started with IceTop

IceTop is a modern desktop interface for managing and querying Apache Iceberg catalogs. It uses `iceframe` under the hood to provide a seamless local data experience.

## Prerequisites

- **Python 3.10+**: Must be installed and available on your system `PATH`.
- **PyIceberg Configuration**: A valid `~/.pyiceberg.yaml` file defining your catalogs.

## Configuration

IceTop reads your `~/.pyiceberg.yaml` configuration file to discover catalogs.

### Example `~/.pyiceberg.yaml`

```yaml
catalog:
  default:
    uri: https://api.tabu.la/ws/
    credential: <your-credential>
    warehouse: s3://my-warehouse-bucket/
  
  local:
    uri: sqlite:///$HOME/iceberg.db
    warehouse: $HOME/iceberg-data/
```

- **Rest Catalog**: Supports any REST-compatible catalog (Tabular, Polaris, Dremio, etc).
- **SQL Catalog**: Supports JDBC/SQLite (great for local testing).
- **Glue/Hive**: Supported via PyIceberg extensions.

## Interface Overview

1. **Sidebar**: Browse catalogs, namespaces, and tables. Drag tables into SQL or Notebooks.
2. **Tabs**:
   - **Chat**: AI assistant for natural language queries and help.
   - **SQL**: Write and execute SQL queries using DataFusion.
   - **Notebook**: Interactive Python notebook environment.
   - **Metadata**: Inspect table schema, partitions, and snapshots.
3. **Status Bar**: Shows backend connection status, active LLM model, and Python runtime.

## Troubleshooting

If the backend fails to connect:
1. Verify `python3` is in your `PATH`.
2. Check logs in the dev console (`Ctrl+Shift+I` -> Console).
3. Ensure required Python packages are installed (`iceframe`, `pyiceberg`, `polars`).
