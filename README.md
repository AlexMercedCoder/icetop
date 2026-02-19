# IceTop

**IceTop** is a modern, cross-platform desktop application for querying, monitoring, and analyzing **Apache Iceberg** catalogs. Powered by [IceFrame](https://github.com/AlexMercedCoder/iceframe), it provides a seamless visual interface for data engineers and analysts.

![IceTop Logo](build/icon.png)

## 🌟 Features

- **Catalog Browser**: Visualize your Iceberg catalog structure (Namespaces -> Tables). Inspect table schemas, snapshots, manifests, and metadata in detail.
- **SQL Workbench**: Run high-performance SQL queries directly against your Iceberg tables using the embedded **Polars** engine.
- **AI Assistant**: A context-aware AI Agent that helps you explore your data.
    - Ask questions in natural language ("How many records were added yesterday?").
    - Generate SQL queries automatically.
    - Visualize results with charts.
    - Supports **OpenAI**, **Anthropic**, and **Google Gemini** models.
- **Notebooks**: An integrated, persistent notebook environment for iterative analysis, allowing you to mix markdown, SQL, and Python-like query logic.
- **In-App Documentation**: Comprehensive guides included directly in the app, offline-ready.
- **Cross-Platform**: Native performant builds for **Windows**, **macOS** (Intel & Apple Silicon), and **Linux**.

## 🚀 Installation

Download the latest installer for your operating system from the [Releases Page](https://github.com/AlexMercedCoder/icetop/releases).

| Platform | Installer |
|----------|-----------|
| **Windows** | `IceTop Setup <version>.exe` |
| **macOS** | `IceTop-<version>.dmg` |
| **Linux** | `IceTop-<version>.AppImage` or `.deb` |

## 🛠️ Development

IceTop is built with **Electron**, **React**, and **Python**. The Python backend is bundled as a standalone executable for production.

### Prerequisites

- **Node.js**: v20+
- **Python**: v3.11+
- **Rust**: (Required for building Polars/Iceberg dependencies if not using pre-built wheels)

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AlexMercedCoder/icetop.git
    cd icetop
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Setup Python Environment:**
    ```bash
    python -m venv venv
    # Linux/Mac
    source venv/bin/activate
    # Windows
    .\venv\Scripts\activate

    pip install -r python/requirements.txt
    ```

### Running Locally

To start the development environment (Electron app + live Python backend):

```bash
npm run dev
```
*The app will automatically detect it's in development mode and spawn the Python process from your venv.*

### Building for Production

To create distributable artifacts (bundles the Python backend via PyInstaller):

```bash
# Build the React app and Electron main process
npm run build

# Package the application (builds Python executable > packages Electron app)
npm run package
```

## 🏗️ Architecture

IceTop utilizes a hybrid architecture to combine the best of web UI and data engineering tools:

*   **Frontend**: Built with **React**, **TypeScript**, **Vite**, and **Zustand**. It handles all UI/UX and communicates with the backend via a local HTTP server.
*   **Backend**: A **Python** process running **FastAPI**. It leverages `iceframe`, `pyiceberg`, and `polars` to interact with Iceberg catalogs efficiently.
*   **AI Layer**: The backend integrates with LLM APIs to provide intelligent query generation and data insights.
*   **Deployment**: The Python backend is compiled into a single-file executable using **PyInstaller**, which is then bundled into the Electron app as an `extraResource`. The Electron main process manages the lifecycle of this backend process.

## 📄 License

MIT © [Alex Merced](https://alexmerced.com)
