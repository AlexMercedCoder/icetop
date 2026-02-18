import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { ChatMessage, ChatSession } from '../types/chat';

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  catalog: string;
  isStreaming: boolean;
  error: string | null;

  // Session management
  createSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;

  setCatalog: (catalog: string) => void;
  sendMessage: (content: string) => Promise<void>;
  resetConversation: () => Promise<void>;
}

const makeSession = (catalog: string): ChatSession => ({
  id: uuid(),
  catalog,
  title: 'New Chat',
  messages: [],
  createdAt: new Date().toISOString(),
});

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  catalog: 'dremio',
  isStreaming: false,
  error: null,

  createSession: () => {
    const session = makeSession(get().catalog);
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));
  },

  switchSession: (sessionId) => set({ activeSessionId: sessionId }),

  deleteSession: (sessionId) => {
    // Tell backend to clear this session agent
    (window as any).icetop.chat.reset(sessionId).catch(() => {});
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      return {
        sessions,
        activeSessionId:
          state.activeSessionId === sessionId
            ? sessions[0]?.id ?? null
            : state.activeSessionId,
      };
    });
  },

  renameSession: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    }));
  },

  setCatalog: (catalog) => set({ catalog }),

  sendMessage: async (content) => {
    let { activeSessionId, sessions, catalog } = get();

    // Auto-create a session if none exists
    if (!activeSessionId) {
      const session = makeSession(catalog);
      sessions = [session, ...sessions];
      activeSessionId = session.id;
      set({ sessions, activeSessionId });
    }

    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg: ChatMessage = {
      id: uuid(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    // Add messages to the active session
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMsg, assistantMsg] }
          : s
      ),
      isStreaming: true,
      error: null,
    }));

    // Auto-title: use first few words of first user message
    const activeSession = get().sessions.find((s) => s.id === activeSessionId);
    if (activeSession && activeSession.messages.length <= 2) {
      const title = content.slice(0, 40) + (content.length > 40 ? '…' : '');
      get().renameSession(activeSessionId!, title);
    }

    try {
      const response: string = await (window as any).icetop.chat.send(
        catalog,
        content,
        activeSessionId
      );

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: response, isStreaming: false }
                    : m
                ),
              }
            : s
        ),
        isStreaming: false,
      }));
    } catch (err: any) {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        content: 'Error: ' + (err.message || 'Failed to get response'),
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        ),
        isStreaming: false,
        error: err.message || 'Chat error',
      }));
    }
  },

  resetConversation: async () => {
    const { activeSessionId } = get();
    if (activeSessionId) {
      try {
        await (window as any).icetop.chat.reset(activeSessionId);
      } catch {
        // Best-effort reset
      }
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === activeSessionId ? { ...s, messages: [] } : s
        ),
        error: null,
      }));
    }
  },
}));
