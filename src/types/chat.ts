// ============================================================
// Chat types
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  catalog: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}
