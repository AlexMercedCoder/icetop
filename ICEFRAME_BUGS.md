# IceFrame Bugs

Bugs discovered in the [IceFrame](https://github.com/apache/iceframe) library while building IceTop.

---

## Bug #1: Agent — Missing `type` in `tool_calls`

**File:** `iceframe/agent/llm_openai.py` (lines 37–45)  
**Severity:** Critical — breaks multi-turn tool calling

When the OpenAI adapter extracts tool_calls from the API response, it drops the `type` field and the `function` wrapper:

```python
# BROKEN:
result["tool_calls"] = [
    {"id": tc.id, "name": tc.function.name, "arguments": tc.function.arguments}
    for tc in message.tool_calls
]

# SHOULD BE:
result["tool_calls"] = [
    {
        "id": tc.id,
        "type": "function",
        "function": {"name": tc.function.name, "arguments": tc.function.arguments}
    }
    for tc in message.tool_calls
]
```

OpenAI rejects the next API call with:
```
Missing required parameter: 'messages[2].tool_calls[0].type'
```

**Additional issue:** `core.py` (lines 78–115) only does one round of tool calls — real queries need multiple rounds.

---

## Bug #2: Agent — Only one round of tool calls

**File:** `iceframe/agent/core.py` (lines 78–115)  
**Severity:** High — agent can't complete multi-step queries

The agent executes tool calls, appends results, and then calls the LLM once more — but doesn't check if that final response also contains tool calls. Needs a loop (max ~10 iterations).

---

## Bug #3: DataFusion — `register_table` passes PyArrow Table instead of Dataset

**File:** `iceframe/datafusion_ops.py` (line 51)  
**Severity:** High — `register_table` always fails

```python
# BROKEN:
table = pa.Table.from_batches(batch_reader)
self.ctx.register_table(alias or table_name, table)  # pa.Table ≠ Dataset

# FIX:
table = pa.Table.from_batches(batch_reader)
self.ctx.register_record_batches(alias or table_name, [table.to_batches()])
```

Error: `dataset argument must be a pyarrow.dataset.Dataset object`

---

## Bug #4: `get_table` — tuple/string mismatch with dotted table names

**File:** `iceframe/core.py` → `get_table()`  
**Severity:** Medium — fails for fully-qualified table names like `namespace.table`

When `get_table("namespace.tablename")` is called, IceFrame (or the underlying PyIceberg catalog adapter) converts the dotted string into a tuple, but somewhere downstream `.lower()` is called on the tuple object instead of a string.

```
Error: 'tuple' object has no attribute 'lower'
```

**Workaround:** Use `ice._catalog.load_table("namespace.table")` directly — PyIceberg's `load_table` handles dotted strings correctly.
