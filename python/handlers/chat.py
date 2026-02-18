"""
Chat handler — manages AI chat sessions using the custom IceTop agent.
"""
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
        return agent.chat(message)

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
