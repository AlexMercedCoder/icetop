# IceTop — Technical Specification

## 1. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Shell** | Electron 33+ | Cross-platform desktop, Chromium renderer, Node.js backend |
| **Renderer** | React 19 + TypeScript | Component model, ecosystem, type safety |
| **Styling** | SCSS modules | SASS-based design system, scoped styles, design token variables |
| **Code editor** | Monaco Editor (`@monaco-editor/react`) | VS Code engine — SQL highlighting, autocomplete |
| **Data grid** | AG Grid Community or TanStack Table | High-performance tabular rendering with virtual scroll |
| **Backend bridge** | Python child process via `python-shell` or `child_process` | Runs IceFrame operations in an isolated Python process |
| **Python library** | `iceframe[agent,datafusion,notebook]` | Core Iceberg operations, AI agent, SQL, notebook magics |
| **State management** | Zustand | Lightweight, no boilerplate |
| **IPC** | Electron `ipcMain` / `ipcRenderer` + `contextBridge` | Secure communication between renderer and main process |
| **Build** | Vite + `electron-builder` | Fast HMR in dev; cross-platform packaging |

---

## 2. Process Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Electron Main Process               │
│                                                        │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Window Mgmt  │    │ Python Process Manager       │  │
│  │              │    │ ┌──────────────────────────┐  │  │
│  │ IPC Router   │◄──►│ │  IceFrame Python Runtime │  │  │
│  │              │    │ │  - Catalog operations     │  │  │
│  │ Config Store │    │ │  - SQL (DataFusion)       │  │  │
│  │              │    │ │  - AI Agent               │  │  │
│  │ Keychain     │    │ │  - Notebook kernel        │  │  │
│  └──────────────┘    │ └──────────────────────────┘  │  │
│                      └──────────────────────────────┘  │
└────────────┬───────────────────────────────────────────┘
             │ IPC (contextBridge)
┌────────────▼───────────────────────────────────────────┐
│                 Electron Renderer Process              │
│                                                        │
│  ┌─────────┐ ┌───────┐ ┌──────┐ ┌──────────┐          │
│  │ Sidebar │ │ Chat  │ │ SQL  │ │ Notebook │          │
│  │ Explorer│ │ Panel │ │Editor│ │ Panel    │          │
│  └─────────┘ └───────┘ └──────┘ └──────────┘          │
└────────────────────────────────────────────────────────┘
```

### 2.1 Python Process Manager

A long-running Python child process is spawned by the Electron main process. Communication uses JSON-RPC over stdin/stdout:

| Direction | Format |
|---|---|
| **Request** (Electron → Python) | `{"id": "uuid", "method": "list_namespaces", "params": {"catalog": "default"}}` |
| **Response** (Python → Electron) | `{"id": "uuid", "result": [...]}` or `{"id": "uuid", "error": {"code": -1, "message": "..."}}` |
| **Stream** (for chat) | `{"id": "uuid", "stream": true, "chunk": "partial text..."}` |

---

## 3. Project Structure

```
icetop/
├── package.json
├── vite.config.ts
├── electron-builder.yml
├── tsconfig.json
│
├── electron/                     # Main process
│   ├── main.ts                   # App entry, window creation
│   ├── preload.ts                # contextBridge API
│   ├── ipc/                      # IPC handlers
│   │   ├── catalog.ts            # Catalog tree operations
│   │   ├── sql.ts                # SQL execution
│   │   ├── chat.ts               # AI agent chat
│   │   ├── notebook.ts           # Notebook cell execution
│   │   └── settings.ts           # Config read/write
│   └── python/
│       ├── manager.ts            # Python process lifecycle
│       └── bridge.py             # JSON-RPC Python server
│
├── python/                       # Python backend
│   ├── requirements.txt
│   ├── server.py                 # JSON-RPC stdin/stdout server
│   ├── handlers/
│   │   ├── catalog_handler.py    # List catalogs, namespaces, tables
│   │   ├── sql_handler.py        # DataFusion SQL execution
│   │   ├── chat_handler.py       # IceFrameAgent wrapper
│   │   └── notebook_handler.py   # Cell execution engine
│   └── config/
│       ├── loader.py             # PyIceberg YAML parser
│       └── settings.py           # App-level settings (LLM keys, etc.)
│
├── src/                          # Renderer (React)
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root layout
│   ├── styles/
│   │   ├── _variables.scss       # Design tokens
│   │   ├── _mixins.scss          # Reusable SCSS mixins
│   │   ├── _reset.scss           # CSS reset
│   │   └── global.scss           # Global styles
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── CatalogTree.tsx
│   │   │   ├── TreeNode.tsx
│   │   │   └── Sidebar.module.scss
│   │   ├── Chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── Chat.module.scss
│   │   ├── SQL/
│   │   │   ├── SQLPanel.tsx
│   │   │   ├── SQLEditor.tsx
│   │   │   ├── ResultsGrid.tsx
│   │   │   ├── QueryHistory.tsx
│   │   │   └── SQL.module.scss
│   │   ├── Notebook/
│   │   │   ├── NotebookPanel.tsx
│   │   │   ├── Cell.tsx
│   │   │   ├── CellOutput.tsx
│   │   │   └── Notebook.module.scss
│   │   ├── Settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── Settings.module.scss
│   │   ├── Docs/
│   │   │   ├── DocsPanel.tsx
│   │   │   └── Docs.module.scss
│   │   └── shared/
│   │       ├── TabBar.tsx
│   │       ├── DragHandle.tsx
│   │       ├── StatusBar.tsx
│   │       └── shared.module.scss
│   ├── hooks/
│   │   ├── useCatalog.ts
│   │   ├── useChat.ts
│   │   ├── useSQL.ts
│   │   └── useNotebook.ts
│   ├── stores/
│   │   ├── catalogStore.ts
│   │   ├── chatStore.ts
│   │   ├── sqlStore.ts
│   │   ├── notebookStore.ts
│   │   └── settingsStore.ts
│   └── types/
│       ├── catalog.ts
│       ├── chat.ts
│       ├── sql.ts
│       └── notebook.ts
│
├── assets/
│   └── icons/                    # App icons (icns, ico, png)
│
├── PRD.md
├── SPEC.md
├── ARCHITECTURE.md
└── DESIGN_SYSTEM.md
```

---

## 4. IPC API Contract

### 4.1 Catalog Operations

```typescript
// List all catalog names from pyiceberg.yaml
icetop.catalog.listCatalogs(): Promise<string[]>

// List namespaces within a catalog
icetop.catalog.listNamespaces(catalog: string): Promise<string[]>

// List tables within a namespace
icetop.catalog.listTables(catalog: string, namespace: string): Promise<string[]>

// Get schema for a table
icetop.catalog.describeTable(catalog: string, table: string): Promise<TableSchema>

// Get snapshot history for a table
icetop.catalog.getSnapshots(catalog: string, table: string): Promise<Snapshot[]>
```

### 4.2 SQL Operations

```typescript
// Execute a SQL query via DataFusion
icetop.sql.execute(catalog: string, query: string): Promise<QueryResult>

// QueryResult shape
interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}
```

### 4.3 Chat Operations

```typescript
// Send a chat message to the IceFrameAgent
icetop.chat.send(catalog: string, message: string): Promise<ReadableStream<string>>

// Reset conversation
icetop.chat.reset(): Promise<void>
```

### 4.4 Notebook Operations

```typescript
// Execute a Python code cell
icetop.notebook.executeCell(catalog: string, code: string): Promise<CellResult>

// CellResult shape
interface CellResult {
  output: string;       // stdout
  error: string | null; // stderr
  data: any | null;     // DataFrame as JSON if return value is a df
  executionTimeMs: number;
}
```

### 4.5 Settings Operations

```typescript
// Get current settings
icetop.settings.get(): Promise<AppSettings>

// Update settings
icetop.settings.update(settings: Partial<AppSettings>): Promise<void>

// AppSettings shape
interface AppSettings {
  pyicebergConfigPath: string;
  llmProvider: 'openai' | 'anthropic' | 'gemini';
  llmApiKey: string;
  llmModel: string;
  pythonPath: string;
  theme: 'light' | 'dark';
}
```

---

## 5. Python Backend Server

The Python backend is a long-running JSON-RPC server that reads from stdin and writes to stdout:

```python
# server.py (simplified)
import sys, json
from iceframe import IceFrame
from iceframe.agent.core import IceFrameAgent

class IceTopServer:
    def __init__(self):
        self.catalogs: dict[str, IceFrame] = {}
        self.agents: dict[str, IceFrameAgent] = {}
    
    def handle_request(self, request: dict) -> dict:
        method = request["method"]
        params = request.get("params", {})
        handler = getattr(self, f"handle_{method}", None)
        if not handler:
            return {"error": {"code": -1, "message": f"Unknown method: {method}"}}
        return handler(params)
    
    def handle_list_catalogs(self, params):
        # Parse ~/.pyiceberg.yaml and return catalog names
        ...

    def handle_execute_sql(self, params):
        catalog = params["catalog"]
        ice = self._get_ice(catalog)
        df = ice.query_datafusion(params["query"])
        return {"result": df.to_dicts()}

    def handle_chat(self, params):
        catalog = params["catalog"]
        agent = self._get_agent(catalog)
        response = agent.chat(params["message"])
        return {"result": response}

    def run(self):
        for line in sys.stdin:
            request = json.loads(line)
            response = self.handle_request(request)
            response["id"] = request["id"]
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
```

---

## 6. Configuration Loading

### 6.1 PyIceberg YAML

IceTop reads the standard `.pyiceberg.yaml` from:
1. `$PYICEBERG_HOME/.pyiceberg.yaml`
2. `~/.pyiceberg.yaml`
3. `./.pyiceberg.yaml` (CWD)

Example structure parsed by IceTop:

```yaml
catalog:
  default:
    uri: https://catalog.example.com
    credential: t-1234:secret
    warehouse: s3://my-bucket/warehouse
  production:
    uri: https://prod-catalog.example.com
    token: pat-xxxx
    warehouse: s3://prod-bucket/warehouse
```

Each catalog entry becomes a root node in the sidebar tree.

### 6.2 IceTop Settings

App-specific settings are stored in `~/.icetop/settings.json`:

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4"
  },
  "pythonPath": "/usr/bin/python3",
  "pyicebergConfigPath": "~/.pyiceberg.yaml",
  "theme": "dark"
}
```

---

## 7. Drag-and-Drop Specification

| Source | Target | Action |
|---|---|---|
| Table node in sidebar | SQL editor | Insert fully-qualified table name at cursor |
| Table node in sidebar | Chat input | Insert table name into message text |
| Table node in sidebar | Notebook cell | Insert `ice.read_table("catalog.namespace.table")` |

Implementation uses HTML5 Drag & Drop API with `dataTransfer.setData("text/icetop-table", tableIdentifier)`.

---

## 8. Security

| Concern | Mitigation |
|---|---|
| API keys in memory | Stored in OS keychain via `safeStorage` API; decrypted only when needed |
| Python code execution | Notebook cells run in the user's own Python venv — same trust model as Jupyter |
| IPC exposure | `contextBridge` exposes only whitelisted methods; `nodeIntegration: false` |
| Config file access | Read-only access to `~/.pyiceberg.yaml`; no modifications |

---

## 9. Build & Distribution

| Task | Tool |
|---|---|
| Dev server | `vite` with Electron plugin |
| TypeScript compilation | `tsc` (strict mode) |
| SCSS compilation | Vite SCSS plugin (built-in via `sass`) |
| Electron packaging | `electron-builder` for `.deb`, `.dmg`, `.exe` |
| Python bundling | Ship `requirements.txt`; user provides Python 3.10+; app creates venv on first launch |
| Auto-updates | `electron-updater` (future) |

---

## 10. Testing Strategy

| Layer | Approach |
|---|---|
| **Python handlers** | `pytest` with mocked IceFrame instances |
| **React components** | Vitest + React Testing Library |
| **IPC integration** | Electron Playwright or Spectron for E2E |
| **Manual** | Verify sidebar tree, drag-and-drop, SQL execution, chat flow |
