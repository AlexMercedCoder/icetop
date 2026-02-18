# AI Assistant

The **Chat** tab provides a context-aware AI assistant to help you explore data and write code.

## Capabilities

- **Natural Language to SQL**: "Show me the top 5 customers by revenue in the orders table."
- **Catalog Awareness**: The AI knows your table schemas and can list available tables.
- **Python Generation**: Ask for Python scripts to perform complex analysis or data engineering tasks.

## Tools

The agent has access to several tools:
- `list_namespaces`: Discover available schemas.
- `list_tables`: Find tables in a namespace.
- `describe_table`: Get schema and column details.
- `execute_sql`: Run SQL queries to inspect data samples.

## Configuration

Configure your LLM provider in the **Settings** tab.

- **OpenAI**: Requires `OPENAI_API_KEY`.
- **Anthropic (Claude)**: Requires `ANTHROPIC_API_KEY`.
- **Google (Gemini)**: Requires `GOOGLE_API_KEY`.

Select your preferred model from the dropdown. The "Reasoning" model setting enables deeper thought chains for complex requests (if supported by the provider).

## Context Management

- **Sessions**: Create multiple chat sessions to keep conversations organized.
- **History**: Chat history is persisted locally.
- **Context Window**: Be mindful of the context window limits of your selected model when working with very large schemas.
