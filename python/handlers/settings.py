"""
Settings handler — manages application configuration in ~/.icetop/config.json.
"""
import json
from pathlib import Path

CONFIG_DIR = Path.home() / ".icetop"
CONFIG_PATH = CONFIG_DIR / "config.json"

DEFAULT_SETTINGS = {
    "llm": {
        "provider": "openai",
        "apiKey": "",
        "model": "gpt-4",
    },
    "database": {
        "backend": "sqlite",
        "sqlitePath": str(CONFIG_DIR / "icetop.db"),
        "postgresUri": "",
    },
    "pyicebergConfigPath": str(Path.home() / ".pyiceberg.yaml"),
    "pythonPath": "python3",
    "theme": "dark",
}


class SettingsHandler:
    def __init__(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    def get(self, params: dict) -> dict:
        if CONFIG_PATH.exists():
            try:
                with open(CONFIG_PATH) as f:
                    saved = json.load(f)
                # Merge with defaults to pick up new fields
                merged = {**DEFAULT_SETTINGS, **saved}
                merged["llm"] = {**DEFAULT_SETTINGS["llm"], **saved.get("llm", {})}
                merged["database"] = {**DEFAULT_SETTINGS["database"], **saved.get("database", {})}
                return merged
            except (json.JSONDecodeError, IOError):
                return DEFAULT_SETTINGS
        return DEFAULT_SETTINGS

    def update(self, params: dict) -> dict:
        settings = params.get("settings", params)
        with open(CONFIG_PATH, "w") as f:
            json.dump(settings, f, indent=2)
        return {"status": "ok"}
