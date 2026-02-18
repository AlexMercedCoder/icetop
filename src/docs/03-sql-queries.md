# SQL Queries

IceTop executes SQL queries locally using **DataFusion**, a high-performance query engine.

## Writing Queries

Go to the **SQL** tab. You can query any table from your configured catalogs.

```sql
SELECT * 
FROM "sandbox.orders" 
WHERE amount > 100 
ORDER BY created_at DESC 
LIMIT 50;
```

> **Note on Quoting**: Use double quotes `"` for table names that contain dots or special characters.

## Features

- **Multi-Tab Interface**: Work on multiple queries simultaneously.
- **History**: Use the `History` button to view and restore previous queries.
- **Export**: Download results as CSV.
- **Performance**: DataFusion executes queries in-memory on your local machine. Large datasets are processed efficiently using Apache Arrow.

## Limitations

- Currently supports `SELECT` (read-only) operations via SQL.
- For write operations (INSERT/UPDATE/MERGE), use the **Notebook** tab with the PyIceberg API.
