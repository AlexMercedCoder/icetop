# IceTop — Product Requirements Document (PRD)

## 1. Vision & Purpose

**IceTop** is a desktop application for querying, monitoring, and managing Apache Iceberg catalogs through a polished, modern interface. It wraps the [IceFrame](https://github.com/AlexMercedCoder/iceframe) Python library and delivers three primary workspaces — **Chat**, **SQL**, and **Notebook** — in an Electron shell.

Users configure catalogs via the standard `~/.pyiceberg.yaml` file and interact with their data through natural-language AI chat, DataFusion SQL, or freeform Python notebooks — all from one unified desktop app.

---

## 2. Target User

| Persona | Description |
|---|---|
| **Data Engineer** | Needs to inspect schemas, run ad-hoc SQL, manage table maintenance |
| **Analytics Engineer** | Wants quick SQL access and schema exploration across catalogs |
| **Data Scientist** | Requires notebook-style Python execution with Polars/Arrow |
| **Platform Engineer** | Monitors multiple catalogs, runs compaction, snapshot management |

---

## 3. Core Features

### 3.1 Sidebar — Catalog Explorer

| Requirement | Detail |
|---|---|
| Auto-load catalogs | Parse `~/.pyiceberg.yaml` on startup; display all configured catalogs |
| Tree navigation | `Catalog → Namespace → Table` hierarchy, expandable/collapsible |
| Drag-and-drop | Drag a table identifier into any workspace to insert it inline |
| Table context menu | Right-click for: Describe, Show Schema, Show Snapshots, Copy Identifier |
| Docs link | Button/section that links to IceFrame docs |
| Settings link | Opens the Settings panel |

### 3.2 Chat Interface

| Requirement | Detail |
|---|---|
| LLM providers | OpenAI, Anthropic, Google Gemini — configured in Settings |
| Agent backend | Use `IceFrameAgent` from `iceframe.agent.core` |
| Conversation history | Scrollable chat bubbles with markdown rendering |
| Agentic actions | Agent can query tables, describe schemas, generate code |
| Code highlighting | Syntax-highlighted code blocks in responses |
| Reset conversation | Button to clear context |

### 3.3 SQL Interface

| Requirement | Detail |
|---|---|
| SQL editor | Monaco-based editor with Iceberg SQL syntax highlighting |
| Execution engine | `ice.query_datafusion(sql, tables=[...])` |
| Results grid | Tabular data grid below the editor with sorting, resizing, pagination |
| Multi-tab | Multiple SQL tabs open simultaneously |
| Query history | Recent queries stored and re-runnable |
| Export results | Copy-to-clipboard, export CSV/JSON/Parquet |

### 3.4 Notebook Interface

| Requirement | Detail |
|---|---|
| Cell-based editor | Markdown and Python cells, ordered top-to-bottom |
| Python execution | Execute via embedded Python runtime (same venv as IceFrame) |
| IceFrame pre-loaded | `ice` instance pre-initialized in notebook kernel |
| Output rendering | Tables, text, and errors rendered inline |
| Save/Load | Notebooks saved as `.icetop.json` files |

### 3.5 Settings Panel

| Requirement | Detail |
|---|---|
| PyIceberg config | Display the path to active `.pyiceberg.yaml`; allow switching |
| LLM configuration | Provider selector (OpenAI / Anthropic / Gemini), API key, model |
| Python path | Configure path to Python venv used for execution |
| Theme | Light / Dark toggle |

### 3.6 Docs Panel

| Requirement | Detail |
|---|---|
| Embedded reference | Inline panel showing key IceFrame API reference |
| Links | Quick links to IceFrame GitHub docs |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Platform** | Linux, macOS, Windows via Electron |
| **Performance** | Sidebar tree loads in < 1 s for catalogs with ≤ 500 tables |
| **Security** | API keys stored in OS keychain via `electron-keytar` or encrypted local config |
| **Offline** | Sidebar, SQL editor, and notebook editor functional offline; chat/catalog operations require network |
| **Accessibility** | Keyboard navigation for all major actions; ARIA labels on interactive elements |

---

## 5. User Flows

### 5.1 First Launch
1. App reads `~/.pyiceberg.yaml` → populates sidebar catalog tree
2. User opens Settings → configures LLM provider + API key
3. User clicks a catalog → namespaces expand → tables appear

### 5.2 SQL Query
1. User opens SQL tab → types query (or drags table from sidebar)
2. Clicks "Run" (or `Ctrl+Enter`) → results appear in grid below
3. User exports results as CSV

### 5.3 Chat Exploration
1. User opens Chat tab → types "What tables are available in my default catalog?"
2. Agent responds with table list
3. User drags a table into chat → "Describe the schema of `orders`"
4. Agent responds with schema breakdown

### 5.4 Notebook Workflow
1. User opens Notebook tab → new notebook with pre-loaded `ice` instance
2. User writes Python code in a cell → executes → sees DataFrame output inline
3. User saves notebook

---

## 6. Success Metrics

| Metric | Target |
|---|---|
| Catalog connection success rate | > 95% for valid `.pyiceberg.yaml` configs |
| Query execution round-trip | < 5 s for simple `SELECT` on tables under 1 M rows |
| Chat response latency | < 3 s to first token (network-dependent) |
| Notebook cell execution | < 2 s for simple IceFrame operations |

---

## 7. Out of Scope (v1)

- Multi-user collaboration / shared notebooks
- Scheduling or orchestration of queries
- Built-in data visualization / charting
- Direct write operations from the SQL interface (read-only SQL in v1)
- Support for non-REST catalog types beyond what PyIceberg supports natively
