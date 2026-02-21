# Settings

Configure IceTop via the **Settings** tab (⚙️ icon in the tab bar).

## Theme

Choose your UI color scheme:

| Theme | Description |
|-------|-------------|
| **Dark** | Deep navy backgrounds with warm yellow/orange accents |
| **Light** | Clean white/gray backgrounds with yellow/orange accents |
| **Iceberg** | Light blue backgrounds matching the IceTop icon, navy accents |
| **Midnight** | Deep dark (GitHub-style) with cool blue accents *(default)* |

Changes apply instantly — no restart required.

## LLM Configuration

Configure the AI model used by the **Chat** tab:

- **Provider**: OpenAI, Anthropic, or Google Gemini.
- **API Key**: Your API key from the chosen provider.
- **Model**: e.g., `gpt-4`, `claude-3-sonnet`, `gemini-pro`.

## Database Backend

Choose where query history, chat logs, and notebooks are stored:

- **SQLite** *(default)*: Local file, zero configuration.
- **PostgreSQL**: Shared database for team setups.

## General

- **PyIceberg Config Path**: Location of your `~/.pyiceberg.yaml` catalog configuration.
- **Python Path**: Path to the Python executable (default: `python3`).

## Global Catalog Selector

The **active catalog** can be changed from the dropdown in the **status bar** at the bottom of the window. This selection affects all panels (Chat, Notebook, SQL) and is sourced from your `~/.pyiceberg.yaml`.
