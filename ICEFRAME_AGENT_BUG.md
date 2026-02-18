# IceFrame Agent Bug Report: Missing `type` in `tool_calls`

## Error

```
Error code: 400 - {'error': {'message': "Missing required parameter: 'messages[2].tool_calls[0].type'.",
'type': 'invalid_request_error', 'param': 'messages[2].tool_calls[0].type',
'code': 'missing_required_parameter'}}
```

## Root Cause

The bug is in two files that work together:

### 1. `iceframe/agent/llm_openai.py` (lines 37–45)

When the OpenAI adapter extracts tool_calls from the API response, it **drops the `type` field**:

```python
# llm_openai.py line 38-45
result["tool_calls"] = [
    {
        "id": tc.id,
        "name": tc.function.name,        # ← custom field
        "arguments": tc.function.arguments  # ← custom field
    }
    for tc in message.tool_calls
]
```

The OpenAI response has `tc.type = "function"`, `tc.function.name`, `tc.function.arguments`.
But IceFrame reformats the tool_call into a custom dict with `name` and `arguments` at the top level,
discarding both the `type` field and the `function` wrapper.

### 2. `iceframe/agent/core.py` (lines 88–93)

The core agent then appends these malformed tool_calls directly into the conversation history:

```python
# core.py line 88-93
self.conversation_history.append({
    "role": "assistant",
    "content": response.get("content", ""),
    "tool_calls": response["tool_calls"]  # ← has {id, name, arguments} — missing type + function wrapper
})
```

When this conversation history is sent back to OpenAI on the next API call (line 103), OpenAI
rejects it because `tool_calls[0].type` is missing.

### 3. Additional issue: only ONE round of tool calls

The agent only does **one** round of tool calling (lines 78–115). After executing tools and
getting a "final response", it doesn't check if the final response ALSO contains tool calls.
Real-world queries often need multiple rounds (e.g., list namespaces → list tables → describe table).

## Fix

### `llm_openai.py` — preserve the OpenAI-compliant format:

```python
# BEFORE (broken):
result["tool_calls"] = [
    {
        "id": tc.id,
        "name": tc.function.name,
        "arguments": tc.function.arguments
    }
    for tc in message.tool_calls
]

# AFTER (fixed):
result["tool_calls"] = [
    {
        "id": tc.id,
        "type": "function",                      # ← ADD THIS
        "function": {                             # ← ADD THIS wrapper
            "name": tc.function.name,
            "arguments": tc.function.arguments
        }
    }
    for tc in message.tool_calls
]
```

### `core.py` — use the proper format AND add a tool-call loop:

```python
# core.py chat() method — replace lines 78-115 with a loop:
max_iterations = 10
for _ in range(max_iterations):
    response = self.llm.chat(messages, tools=self.tools)

    if "tool_calls" not in response:
        # Text response — done
        assistant_message = response["content"]
        break

    # Execute tools
    self.conversation_history.append({
        "role": "assistant",
        "content": response.get("content", ""),
        "tool_calls": response["tool_calls"]  # Now has correct format from fixed llm_openai.py
    })

    for tc in response["tool_calls"]:
        fn = tc["function"]
        result = self._execute_tool(fn["name"], json.loads(fn["arguments"]))
        self.conversation_history.append({
            "role": "tool",
            "content": str(result),
            "tool_call_id": tc["id"]
        })

    messages = [{"role": "system", "content": self.system_prompt}] + self.conversation_history
else:
    assistant_message = "Reached max tool iterations."
```

## Files to Edit

| File | Line(s) | Change |
|------|---------|--------|
| `iceframe/agent/llm_openai.py` | 38-45 | Add `"type": "function"` and `"function": {...}` wrapper to tool_call dicts |
| `iceframe/agent/core.py` | 78-115 | Access tool name/args via `tc["function"]["name"]` and wrap in a loop |

---

# IceFrame Bug #2: DataFusion `register_table` passes PyArrow Table instead of Dataset

## Error

```
dataset argument must be a pyarrow.dataset.Dataset object
```

## Root Cause

In `iceframe/datafusion_ops.py`, line 51:

```python
table = pa.Table.from_batches(batch_reader)
self.ctx.register_table(alias or table_name, table)  # ← BUG: table is pa.Table, not a Dataset
```

DataFusion's `register_table` requires a `pyarrow.dataset.Dataset` object, not a plain `pa.Table`.

## Fix

Use `register_record_batches` instead:

```python
# BEFORE (broken):
table = pa.Table.from_batches(batch_reader)
self.ctx.register_table(alias or table_name, table)

# AFTER (fixed):
table = pa.Table.from_batches(batch_reader)
self.ctx.register_record_batches(alias or table_name, [table.to_batches()])
```
