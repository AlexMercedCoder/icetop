#!/usr/bin/env python3
"""
IceTop Python Backend Server
JSON-RPC over stdin/stdout
"""
import sys
import json
import traceback
import datetime
import decimal
from handlers.catalog import CatalogHandler
from handlers.sql import SQLHandler
from handlers.chat import ChatHandler
from handlers.notebook import NotebookHandler
from handlers.settings import SettingsHandler


class SafeEncoder(json.JSONEncoder):
    """Handle date, datetime, Decimal, bytes, and other non-serializable types."""
    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        if isinstance(obj, datetime.time):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="replace")
        if isinstance(obj, set):
            return list(obj)
        return str(obj)  # Fallback: convert anything to string


class Server:
    def __init__(self):
        self.handlers = {}
        self._register_handlers()

    def _register_handlers(self):
        catalog = CatalogHandler()
        sql = SQLHandler()
        chat = ChatHandler()
        notebook = NotebookHandler()
        settings = SettingsHandler()

        self.handlers = {
            "ping": lambda params: {"status": "ok"},
            "list_catalogs": catalog.list_catalogs,
            "list_namespaces": catalog.list_namespaces,
            "list_tables": catalog.list_tables,
            "list_children": catalog.list_children,
            "describe_table": catalog.describe_table,
            "get_snapshots": catalog.get_snapshots,
            "execute_sql": sql.execute,
            "get_query_history": sql.get_history,
            "chat": chat.send,
            "chat_reset": chat.reset,
            "chat_reload": chat.reload,
            "execute_cell": notebook.execute_cell,
            "list_packages": notebook.list_packages,
            "get_settings": settings.get,
            "update_settings": settings.update,
        }

    def handle_request(self, request: dict) -> dict:
        req_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})

        handler = self.handlers.get(method)
        if not handler:
            return {
                "id": req_id,
                "error": {"code": -32601, "message": f"Method not found: {method}"},
            }

        try:
            result = handler(params)
            return {"id": req_id, "result": result}
        except Exception as e:
            return {
                "id": req_id,
                "error": {"code": -32000, "message": str(e), "data": traceback.format_exc()},
            }

    def run(self):
        """Main event loop: read JSON-RPC requests from stdin, write responses to stdout."""
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
                response = self.handle_request(request)
            except json.JSONDecodeError as e:
                response = {
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {e}"},
                }

            sys.stdout.write(json.dumps(response, cls=SafeEncoder) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    server = Server()
    server.run()
