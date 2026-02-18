"""
Shared utility: loads catalog configs from ~/.pyiceberg.yaml
and creates IceFrame instances.
"""
import yaml
from pathlib import Path
from iceframe import IceFrame


_CONFIG_PATH = Path.home() / ".pyiceberg.yaml"
_instances: dict[str, IceFrame] = {}


def load_pyiceberg_config() -> dict:
    """Read ~/.pyiceberg.yaml and return the full config dict."""
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            return yaml.safe_load(f) or {}
    return {}


def list_catalog_names() -> list[str]:
    """Return the catalog names defined in pyiceberg.yaml."""
    config = load_pyiceberg_config()
    return list(config.get("catalog", {}).keys())


def get_catalog_config(catalog_name: str) -> dict:
    """Return the config dict for a specific catalog."""
    config = load_pyiceberg_config()
    catalogs = config.get("catalog", {})
    if catalog_name not in catalogs:
        raise ValueError(f"Catalog '{catalog_name}' not found in {_CONFIG_PATH}")
    return catalogs[catalog_name]


def get_iceframe(catalog_name: str) -> IceFrame:
    """Get or create a cached IceFrame instance for the given catalog."""
    if catalog_name not in _instances:
        catalog_config = get_catalog_config(catalog_name)
        _instances[catalog_name] = IceFrame(catalog_config)
    return _instances[catalog_name]


def clear_instances():
    """Clear all cached IceFrame instances."""
    _instances.clear()
