# Notebooks

The **Notebook** tab offers a Jupyter-like Python environment for advanced data manipulation and engineering.

## Environment

- **Runtime**: Executes in the same local Python process as the backend.
- **State Persistence**: Variables defined in one cell are available in subsequent cells.
- **Output**: Supports text, tables (DataFrames), and charts.

## Libraries

Useful libraries pre-available in the environment:

- `iceframe`: The core library for Iceberg operations.
- `pyiceberg`: The official Python Iceberg client.
- `polars`: Fast DataFrame library (preferred over Pandas).
- `pyarrow`: Apache Arrow columnar memory format.

## Examples

### Loading a Table

```python
from iceframe import IceFrame

# Initialize wrapper
ice = IceFrame.from_catalog("sandbox")

# Load table into Polars DataFrame
df = ice.read_table("sandbox.sales_data")
print(df.head())
```

### Creating a Table

```python
import polars as pl

# Create sample data
data = pl.DataFrame({"id": [1, 2, 3], "value": ["a", "b", "c"]})

# Create table
ice.create_table("sandbox.new_table", data)
```

### Visualizing Data

```python
# Create a chart (requires backend chart support)
ice.chart(df, type="bar", x="category", y="amount")
```
