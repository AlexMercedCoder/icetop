"""
Chat handler — manages AI chat sessions with streaming progress notifications.
"""
import json
import sys
from handlers.agent import IceTopAgent


class ChatHandler:
    def __init__(self):
        # sessions: { session_id: IceTopAgent }
        self._sessions: dict[str, IceTopAgent] = {}

    def send(self, params: dict) -> str:
        catalog = params["catalog"]
        message = params["message"]
        session_id = params.get("sessionId", "default")

        if session_id not in self._sessions:
            self._sessions[session_id] = IceTopAgent(catalog)

        agent = self._sessions[session_id]

        def progress_cb(event: dict):
            """Write a JSON-RPC notification (no id) to stdout for progress events."""
            notification = {
                "notification": "chat:progress",
                "params": {
                    "sessionId": session_id,
                    **event,
                },
            }
            sys.stdout.write(json.dumps(notification) + "\n")
            sys.stdout.flush()

        return agent.chat(message, progress_cb=progress_cb)

    def reset(self, params: dict) -> dict:
        session_id = params.get("sessionId")
        if session_id and session_id in self._sessions:
            del self._sessions[session_id]
        else:
            self._sessions.clear()
        return {"status": "ok"}

    def reload(self, params: dict) -> dict:
        """Clear all sessions so new credentials are picked up."""
        self._sessions.clear()
        return {"status": "ok"}
