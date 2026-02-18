"""
Custom AI agent for IceTop — uses native tool-calling APIs
for OpenAI, Anthropic, and Google to interact with Iceberg catalogs.
"""
import json
import os
from pathlib import Path
from typing import Any

from handlers.iceframe_loader import get_iceframe

CONFIG_PATH = Path.home() / ".icetop" / "config.json"

# ── Tool definitions (provider-agnostic) ──────────────────────

TOOLS = [
    {
        "name": "list_namespaces",
        "description": "List all namespaces (schemas/databases) in the Iceberg catalog, recursively including sub-namespaces. Returns a flat list with fully-qualified namespace paths.",
        "parameters": {
            "type": "object",
            "properties": {
                "parent": {
                    "type": "string",
                    "description": "Optional parent namespace to list children of. Omit to list all namespaces recursively.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "list_tables",
        "description": "List all tables in a specific namespace.",
        "parameters": {
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "description": "The namespace to list tables from, e.g. 'default' or 'my_schema'",
                }
            },
            "required": ["namespace"],
        },
    },
    {
        "name": "describe_table",
        "description": "Get the schema (column names, types, docs), partition spec, and properties of an Iceberg table.",
        "parameters": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "description": "Fully qualified table name, e.g. 'my_namespace.my_table'",
                }
            },
            "required": ["table"],
        },
    },
    {
        "name": "read_table",
        "description": "Read data rows from an Iceberg table. Returns up to 200 rows. Use columns and filter_expr to narrow results.",
        "parameters": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "description": "Table name, e.g. 'my_namespace.my_table'",
                },
                "columns": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of column names to select",
                },
                "filter_expr": {
                    "type": "string",
                    "description": "Optional filter expression, e.g. \"age > 30\"",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max rows to return (default 50, max 200)",
                },
            },
            "required": ["table"],
        },
    },
    {
        "name": "query_sql",
        "description": "Execute a SQL query using Apache DataFusion against the Iceberg catalog. Returns results as rows.",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "The SQL query to execute",
                }
            },
            "required": ["sql"],
        },
    },
    {
        "name": "get_snapshots",
        "description": "Get the snapshot history of an Iceberg table, showing operations and timestamps.",
        "parameters": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "description": "Table name, e.g. 'my_namespace.my_table'",
                }
            },
            "required": ["table"],
        },
    },
    {
        "name": "get_table_stats",
        "description": "Get statistics for an Iceberg table: row count, file count, total size, current snapshot.",
        "parameters": {
            "type": "object",
            "properties": {
                "table": {
                    "type": "string",
                    "description": "Table name, e.g. 'my_namespace.my_table'",
                }
            },
            "required": ["table"],
        },
    },
]

SYSTEM_PROMPT = """You are IceTop AI, a helpful data assistant for Apache Iceberg catalogs.

You have access to tools that let you explore and query Iceberg tables. When the user asks
about their data, USE THE TOOLS to get real information before responding. Do not guess or
make up table names, schemas, or data.

Guidelines:
- When listing tables, use list_namespaces first, then list_tables for each relevant namespace.
- Use describe_table to see column names and types before writing SQL.
- Use read_table for simple data retrieval. Use query_sql for complex analytics.
- For read_table, always set a reasonable limit (50 unless the user asks for more).
- Present data in clean, readable markdown tables.
- When showing query results, include the SQL you ran.
- Be concise in your explanations.
"""


# ── Tool execution ────────────────────────────────────────────

def _parse_table_list(tables):
    """Parse table names from IceFrame's list_tables return."""
    result = []
    for t in tables:
        if isinstance(t, (tuple, list)):
            result.append(t[-1])
        elif isinstance(t, str):
            if t.startswith("(") and t.endswith(")"):
                parts = t.strip("()").split(",")
                result.append(parts[-1].strip().strip("'\""))
            else:
                result.append(t)
        else:
            result.append(str(t))
    return result


def _list_namespaces_recursive(ice, parent=None) -> list[str]:
    """Recursively list all namespaces."""
    result = []
    try:
        if parent:
            namespaces = ice.list_namespaces(parent)
        else:
            namespaces = ice.list_namespaces()

        for ns in namespaces:
            fqn = ".".join(ns) if isinstance(ns, (tuple, list)) else str(ns)
            result.append(fqn)
            # Recurse into children
            try:
                children = _list_namespaces_recursive(ice, fqn)
                result.extend(children)
            except Exception:
                pass
    except Exception:
        pass
    return result


def execute_tool(ice, tool_name: str, args: dict, progress_cb=None) -> str:
    """Execute a tool and return the result as a JSON string."""
    if progress_cb:
        progress_cb({"type": "tool_start", "tool": tool_name, "args": args})

    try:
        if tool_name == "list_namespaces":
            parent = args.get("parent")
            ns_list = _list_namespaces_recursive(ice, parent)
            result = json.dumps({"namespaces": ns_list})

        elif tool_name == "list_tables":
            ns = args.get("namespace", "default")
            tables = ice.list_tables(ns)
            result = json.dumps({"namespace": ns, "tables": _parse_table_list(tables)})

        elif tool_name == "describe_table":
            table_name = args["table"]
            tbl = ice.get_table(table_name)
            schema = tbl.schema()
            columns = [
                {"name": f.name, "type": str(f.field_type), "required": f.required, "doc": f.doc}
                for f in schema.fields
            ]
            partition_spec = [str(f) for f in tbl.spec().fields] if tbl.spec() else []
            props = dict(tbl.properties) if hasattr(tbl, "properties") else {}
            result = json.dumps({"columns": columns, "partitionSpec": partition_spec, "properties": props})

        elif tool_name == "read_table":
            table_name = args["table"]
            columns = args.get("columns")
            filter_expr = args.get("filter_expr")
            limit = min(args.get("limit", 50), 200)
            df = ice.read_table(table_name, columns=columns, filter_expr=filter_expr, limit=limit)
            import datetime, decimal
            rows = df.to_dicts()
            # Sanitize non-serializable types
            for row in rows:
                for k, v in row.items():
                    if isinstance(v, (datetime.date, datetime.datetime)):
                        row[k] = v.isoformat()
                    elif isinstance(v, decimal.Decimal):
                        row[k] = float(v)
                    elif isinstance(v, bytes):
                        row[k] = v.decode('utf-8', errors='replace')
            result = json.dumps({"columns": df.columns, "rows": rows, "rowCount": len(df)})

        elif tool_name == "query_sql":
            sql = args["sql"]
            df = ice.query_datafusion(sql)
            rows = df.to_dicts()
            result = json.dumps({"columns": df.columns, "rows": rows[:200], "rowCount": len(rows)})

        elif tool_name == "get_snapshots":
            table_name = args["table"]
            tbl = ice.get_table(table_name)
            snapshots = []
            for snap in tbl.metadata.snapshots:
                snapshots.append({
                    "snapshotId": str(snap.snapshot_id),
                    "timestamp": str(snap.timestamp_ms),
                    "operation": snap.summary.operation if snap.summary else "unknown",
                })
            result = json.dumps({"snapshots": snapshots})

        elif tool_name == "get_table_stats":
            table_name = args["table"]
            tbl = ice.get_table(table_name)
            current = tbl.current_snapshot()
            stats = {
                "table": table_name,
                "currentSnapshotId": str(current.snapshot_id) if current else None,
                "schemaId": tbl.schema().schema_id,
                "columnCount": len(tbl.schema().fields),
            }
            if current and current.summary:
                s = current.summary
                stats["totalRecords"] = s.get("total-records", "unknown")
                stats["totalDataFiles"] = s.get("total-data-files", "unknown")
                stats["totalFileSize"] = s.get("total-files-size", "unknown")
            result = json.dumps(stats)

        else:
            result = json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        result = json.dumps({"error": str(e)})

    if progress_cb:
        progress_cb({"type": "tool_done", "tool": tool_name})

    return result


# ── Provider adapters ─────────────────────────────────────────

def _get_config() -> dict:
    """Load LLM config from ~/.icetop/config.json or env vars."""
    config = {"provider": "openai", "apiKey": "", "model": "gpt-4"}

    # Try config.json first
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH) as f:
                data = json.load(f)
            llm = data.get("llm", {})
            config["provider"] = llm.get("provider", config["provider"])
            config["apiKey"] = llm.get("apiKey", config["apiKey"])
            config["model"] = llm.get("model", config["model"])
        except (json.JSONDecodeError, IOError):
            pass

    # Fall back to env vars
    if not config["apiKey"]:
        config["apiKey"] = os.environ.get("OPENAI_API_KEY", "")
        if os.environ.get("OPEN_AI_MODEL"):
            config["model"] = os.environ["OPEN_AI_MODEL"]
    if not config["apiKey"]:
        config["apiKey"] = os.environ.get("ANTHROPIC_API_KEY", "")
        if config["apiKey"]:
            config["provider"] = "anthropic"
    if not config["apiKey"]:
        config["apiKey"] = os.environ.get("GOOGLE_API_KEY", "")
        if config["apiKey"]:
            config["provider"] = "gemini"

    return config


def _openai_tools():
    """Convert tool defs to OpenAI format."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters"],
            },
        }
        for t in TOOLS
    ]


def _run_openai(ice, messages: list, config: dict, progress_cb=None) -> str:
    """Run the agent loop using OpenAI's API."""
    from openai import OpenAI

    client = OpenAI(api_key=config["apiKey"])
    tools = _openai_tools()

    if progress_cb:
        progress_cb({"type": "thinking", "message": "Thinking..."})

    while True:
        response = client.chat.completions.create(
            model=config["model"],
            messages=messages,
            tools=tools,
            tool_choice="auto",
        )

        choice = response.choices[0]
        msg = choice.message

        # If the model wants to call tools
        if msg.tool_calls:
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments)
                result = execute_tool(ice, tc.function.name, args, progress_cb)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })

            if progress_cb:
                progress_cb({"type": "thinking", "message": "Analyzing results..."})
            continue

        # Model returned a text response — done
        messages.append({"role": "assistant", "content": msg.content or ""})
        return msg.content or ""


def _anthropic_tools():
    """Convert tool defs to Anthropic format."""
    return [
        {
            "name": t["name"],
            "description": t["description"],
            "input_schema": t["parameters"],
        }
        for t in TOOLS
    ]


def _run_anthropic(ice, messages: list, config: dict, progress_cb=None) -> str:
    """Run the agent loop using Anthropic's API."""
    import anthropic

    client = anthropic.Anthropic(api_key=config["apiKey"])
    tools = _anthropic_tools()

    # Extract system prompt from messages
    system_text = ""
    user_messages = []
    for m in messages:
        if m["role"] == "system":
            system_text = m["content"]
        else:
            user_messages.append(m)

    if progress_cb:
        progress_cb({"type": "thinking", "message": "Thinking..."})

    while True:
        response = client.messages.create(
            model=config["model"],
            max_tokens=4096,
            system=system_text,
            messages=user_messages,
            tools=tools,
        )

        # Check if the model wants to use tools
        if response.stop_reason == "tool_use":
            # Add assistant message with tool_use blocks
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
            user_messages.append({"role": "assistant", "content": assistant_content})

            # Execute tools and add results
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(ice, block.name, block.input, progress_cb)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })
            user_messages.append({"role": "user", "content": tool_results})

            if progress_cb:
                progress_cb({"type": "thinking", "message": "Analyzing results..."})
            continue

        # Model returned text — done
        text = ""
        for block in response.content:
            if hasattr(block, "text"):
                text += block.text
        user_messages.append({"role": "assistant", "content": text})
        # Sync back to the original messages list
        messages.clear()
        messages.append({"role": "system", "content": system_text})
        messages.extend(user_messages)
        return text


def _run_google(ice, messages: list, config: dict, progress_cb=None) -> str:
    """Run the agent loop using Google Generative AI."""
    import google.generativeai as genai

    genai.configure(api_key=config["apiKey"])

    # Convert tool definitions to Google format
    tool_declarations = []
    for t in TOOLS:
        tool_declarations.append(
            genai.protos.FunctionDeclaration(
                name=t["name"],
                description=t["description"],
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        k: genai.protos.Schema(type=genai.protos.Type.STRING, description=v.get("description", ""))
                        for k, v in t["parameters"].get("properties", {}).items()
                    },
                    required=t["parameters"].get("required", []),
                ),
            )
        )

    google_tools = genai.protos.Tool(function_declarations=tool_declarations)

    # Extract system instruction and build history
    system_text = ""
    history = []
    current_parts = None

    for m in messages:
        if m["role"] == "system":
            system_text = m["content"]
        elif m["role"] == "user":
            history.append({"role": "user", "parts": [m["content"]]})
        elif m["role"] == "assistant":
            history.append({"role": "model", "parts": [m["content"]]})

    model = genai.GenerativeModel(
        model_name=config["model"],
        system_instruction=system_text,
        tools=[google_tools],
    )

    chat = model.start_chat(history=history[:-1] if history else [])
    last_user = history[-1]["parts"][0] if history else ""

    if progress_cb:
        progress_cb({"type": "thinking", "message": "Thinking..."})

    max_iterations = 10
    for _ in range(max_iterations):
        response = chat.send_message(last_user)

        # Check for function calls
        fc = response.candidates[0].content.parts
        has_fn_call = any(hasattr(p, "function_call") and p.function_call.name for p in fc)

        if has_fn_call:
            fn_responses = []
            for part in fc:
                if hasattr(part, "function_call") and part.function_call.name:
                    fn_name = part.function_call.name
                    fn_args = dict(part.function_call.args) if part.function_call.args else {}
                    result = execute_tool(ice, fn_name, fn_args, progress_cb)
                    fn_responses.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=fn_name,
                                response={"result": json.loads(result)},
                            )
                        )
                    )
            last_user = fn_responses

            if progress_cb:
                progress_cb({"type": "thinking", "message": "Analyzing results..."})
            continue

        # Text response — done
        text = response.text
        messages.append({"role": "assistant", "content": text})
        return text

    return "I was unable to complete the request after multiple tool calls."


# ── Main agent class ──────────────────────────────────────────

class IceTopAgent:
    def __init__(self, catalog: str):
        self.catalog = catalog
        self.ice = get_iceframe(catalog)
        self.messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    def chat(self, user_message: str, progress_cb=None) -> str:
        self.messages.append({"role": "user", "content": user_message})
        config = _get_config()

        if not config["apiKey"]:
            return "⚠️ No AI API key configured. Go to Settings and add your OpenAI, Anthropic, or Google API key."

        provider = config["provider"]
        try:
            if provider == "openai":
                return _run_openai(self.ice, self.messages, config, progress_cb)
            elif provider == "anthropic":
                return _run_anthropic(self.ice, self.messages, config, progress_cb)
            elif provider in ("gemini", "google"):
                return _run_google(self.ice, self.messages, config, progress_cb)
            else:
                return f"⚠️ Unknown provider: {provider}. Supported: openai, anthropic, gemini."
        except Exception as e:
            error_msg = f"⚠️ AI error: {str(e)}"
            self.messages.append({"role": "assistant", "content": error_msg})
            return error_msg
