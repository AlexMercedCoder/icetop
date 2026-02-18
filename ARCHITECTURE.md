# IceTop — System Architecture

## 1. Overview

IceTop follows a **three-layer architecture** connecting the Electron renderer, the Electron main process, and an embedded Python backend.

```mermaid
graph TB
    subgraph Renderer["Renderer Process (React + SCSS)"]
        UI[UI Components]
        Store[Zustand Stores]
        Hooks[Custom Hooks]
    end

    subgraph Main["Main Process (Node.js)"]
        IPC[IPC Router]
        PM[Python Manager]
        Config[Config & Keychain]
    end

    subgraph Python["Python Backend"]
        Server[JSON-RPC Server]
        ICE[IceFrame Core]
        Agent[IceFrame Agent]
        DF[DataFusion SQL]
        Kernel[Notebook Kernel]
    end

    UI --> Store
    Store --> Hooks
    Hooks -->|contextBridge| IPC
    IPC --> PM
    IPC --> Config
    PM -->|stdin/stdout JSON-RPC| Server
    Server --> ICE
    Server --> Agent
    Server --> DF
    Server --> Kernel
    ICE -->|PyIceberg| Catalog[(Iceberg Catalog)]
```

---

## 2. Layer Responsibilities

### 2.1 Renderer Process

| Module | Responsibility |
|---|---|
| **Sidebar** | Displays catalog tree; supports expand/collapse, context menus, drag source |
| **Chat Panel** | Chat UI with message history, markdown rendering, streaming response |
| **SQL Panel** | Monaco editor for SQL; results grid; query tabs; history |
| **Notebook Panel** | Cell-based editor; Python & Markdown cells; inline output |
| **Settings Panel** | Form for LLM config, Python path, theme toggle |
| **Zustand Stores** | Client-side state: catalog tree cache, open tabs, chat history, settings |

### 2.2 Main Process

| Module | Responsibility |
|---|---|
| **Window Manager** | Creates and manages the BrowserWindow; handles app lifecycle |
| **IPC Router** | Receives `invoke` calls from renderer; dispatches to Python or local handlers |
| **Python Manager** | Spawns, monitors, and restarts the Python child process |
| **Config Store** | Reads/writes `~/.icetop/settings.json`; interfaces with `safeStorage` |

### 2.3 Python Backend

| Module | Responsibility |
|---|---|
| **JSON-RPC Server** | Reads stdin line-by-line; dispatches to handlers; writes JSON to stdout |
| **Catalog Handler** | Loads `~/.pyiceberg.yaml`; creates `IceFrame` instances per catalog |
| **SQL Handler** | Calls `ice.query_datafusion()` and converts results to JSON |
| **Chat Handler** | Wraps `IceFrameAgent`; supports multi-turn conversation |
| **Notebook Handler** | Maintains a persistent Python namespace; executes cells via `exec()` |
| **Config Loader** | Parses PyIceberg YAML; resolves env var overrides |

---

## 3. Data Flow Diagrams

### 3.1 SQL Query Execution

```mermaid
sequenceDiagram
    participant User
    participant SQLPanel as SQL Panel
    participant IPC as IPC (Main)
    participant Python as Python Backend
    participant Catalog as Iceberg Catalog

    User->>SQLPanel: Writes SQL + clicks Run
    SQLPanel->>IPC: invoke("sql.execute", {query, catalog})
    IPC->>Python: JSON-RPC {method: "execute_sql", params: {...}}
    Python->>Python: ice.query_datafusion(query)
    Python->>Catalog: PyIceberg scan (predicate pushdown)
    Catalog-->>Python: Arrow batches
    Python-->>Python: Convert to Polars → JSON
    Python-->>IPC: {result: {columns, rows, rowCount, executionTimeMs}}
    IPC-->>SQLPanel: QueryResult
    SQLPanel-->>User: Render data grid
```

### 3.2 Chat Message

```mermaid
sequenceDiagram
    participant User
    participant ChatPanel as Chat Panel
    participant IPC as IPC (Main)
    participant Python as Python Backend
    participant LLM as LLM API

    User->>ChatPanel: Types message
    ChatPanel->>IPC: invoke("chat.send", {message, catalog})
    IPC->>Python: JSON-RPC {method: "chat", params: {...}}
    Python->>Python: agent.chat(message)
    Python->>LLM: LLM API call (with tools)
    LLM-->>Python: Response (may include tool calls)
    Python->>Python: Execute tool calls (schema lookup, queries)
    Python-->>IPC: {result: "Agent response text..."}
    IPC-->>ChatPanel: Response string
    ChatPanel-->>User: Render markdown bubble
```

### 3.3 Notebook Cell Execution

```mermaid
sequenceDiagram
    participant User
    participant Notebook as Notebook Panel
    participant IPC as IPC (Main)
    participant Python as Python Backend

    User->>Notebook: Writes Python code in cell
    User->>Notebook: Shift+Enter
    Notebook->>IPC: invoke("notebook.executeCell", {code, catalog})
    IPC->>Python: JSON-RPC {method: "execute_cell", params: {...}}
    Python->>Python: exec(code, namespace)
    Python->>Python: Capture stdout + check for DataFrame
    Python-->>IPC: {result: {output, error, data, executionTimeMs}}
    IPC-->>Notebook: CellResult
    Notebook-->>User: Render output / table / error
```

---

## 4. State Management

```mermaid
graph LR
    subgraph Stores
        CS[catalogStore]
        SS[sqlStore]
        CHS[chatStore]
        NS[notebookStore]
        STS[settingsStore]
    end

    CS -->|catalogs, namespaces, tables| Sidebar
    SS -->|tabs, results, history| SQLPanel
    CHS -->|messages, streaming| ChatPanel
    NS -->|cells, outputs| NotebookPanel
    STS -->|theme, llm config| SettingsPanel
```

Each store is independent and follows the pattern:

```typescript
interface SQLStore {
  tabs: SQLTab[];
  activeTabId: string;
  history: QueryHistoryItem[];
  // Actions
  addTab: () => void;
  closeTab: (id: string) => void;
  executeQuery: (tabId: string) => Promise<void>;
}
```

---

## 5. Python Process Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Spawning: App starts
    Spawning --> Ready: Python process responds to health check
    Spawning --> Error: Process fails to start
    Ready --> Processing: Request received
    Processing --> Ready: Response sent
    Ready --> Restarting: Process crash detected
    Restarting --> Ready: New process healthy
    Ready --> Shutdown: App quits
    Error --> Restarting: Retry (max 3)
    Restarting --> Error: Max retries exceeded
    Shutdown --> [*]
```

The Python Manager:
- Spawns `python3 -u server.py` with unbuffered output
- Sends a health check `{"method": "ping"}` on startup
- Monitors the process and auto-restarts on crash (up to 3 retries)
- Gracefully terminates on app quit

---

## 6. Key Design Decisions

| Decision | Rationale |
|---|---|
| **Python child process (not REST server)** | Avoids port conflicts and firewall issues; stdin/stdout is simpler and lower latency |
| **JSON-RPC over stdin/stdout** | Language-agnostic, lightweight, supports request-response and streaming |
| **One Python process per app** | Multiple `IceFrame` instances (one per catalog) live in the same process for efficient resource sharing |
| **Monaco Editor** | Same engine as VS Code; excellent SQL and Python support out of the box |
| **Zustand over Redux** | Minimal boilerplate; IceTop's state is straightforward enough for Zustand |
| **SCSS Modules** | Scoped styles prevent leaks; SCSS variables align with design system tokens |
| **Polars DataFrames → JSON** | Conversion happens server-side; frontend receives plain JSON arrays for grid rendering |
