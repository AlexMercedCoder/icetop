"""
Notebook handler — executes Python cells with an IceFrame instance pre-loaded.
"""
import io
import sys
import time
import traceback
from iceframe import IceFrame
from handlers.iceframe_loader import get_iceframe


class NotebookHandler:
    def __init__(self):
        self._namespace: dict = {}

    def execute_cell(self, params: dict) -> dict:
        catalog = params["catalog"]
        code = params["code"]
        ice = get_iceframe(catalog)

        # Prepare execution namespace with ice pre-loaded
        if "ice" not in self._namespace:
            self._namespace["ice"] = ice
            self._namespace["IceFrame"] = IceFrame

        # Capture stdout
        old_stdout = sys.stdout
        captured = io.StringIO()
        sys.stdout = captured

        start = time.time()
        error_msg = None
        result_data = None

        try:
            exec(code, self._namespace)
            # Check if last expression produced a value
            if "_" in self._namespace and self._namespace["_"] is not None:
                result_data = str(self._namespace["_"])
        except Exception:
            error_msg = traceback.format_exc()
        finally:
            sys.stdout = old_stdout

        elapsed_ms = int((time.time() - start) * 1000)

        return {
            "text": captured.getvalue(),
            "error": error_msg,
            "data": result_data,
            "executionTimeMs": elapsed_ms,
        }

    def list_packages(self, params: dict) -> list[dict]:
        """Return all installed Python packages with their versions."""
        from importlib.metadata import distributions
        packages = []
        for dist in distributions():
            packages.append({
                "name": dist.metadata["Name"],
                "version": dist.metadata["Version"],
            })
        # Deduplicate and sort
        seen = set()
        unique = []
        for pkg in sorted(packages, key=lambda p: p["name"].lower()):
            if pkg["name"] not in seen:
                seen.add(pkg["name"])
                unique.append(pkg)
        return unique
