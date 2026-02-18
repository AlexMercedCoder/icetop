import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Send, RotateCcw, Loader2, Plus, Trash2, MessageSquare } from 'lucide-react';
import { marked } from 'marked';
import './Chat.scss';

export const ChatPanel: React.FC = () => {
  const {
    sessions, activeSessionId, isStreaming, catalog, toolStatus,
    sendMessage, resetConversation, createSession,
    switchSession, deleteSession,
  } = useChatStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tableName = e.dataTransfer.getData('text/icetop-table');
    if (tableName) {
      setInput((prev) => prev + tableName);
      inputRef.current?.focus();
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      return { __html: marked.parse(content, { async: false }) as string };
    } catch {
      return { __html: content };
    }
  };

  return (
    <div
      className="chat-panel"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
    >
      {/* Session sidebar */}
      <div className="chat-panel__sessions">
        <div className="chat-panel__sessions-header">
          <span>Chats</span>
          <button className="btn btn--ghost btn--sm" onClick={createSession} title="New chat">
            <Plus size={14} />
          </button>
        </div>
        <div className="chat-panel__sessions-list scrollable">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`chat-panel__session-item ${s.id === activeSessionId ? 'chat-panel__session-item--active' : ''}`}
              onClick={() => switchSession(s.id)}
            >
              <MessageSquare size={13} />
              <span className="chat-panel__session-title">{s.title}</span>
              <button
                className="chat-panel__session-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(s.id);
                }}
                title="Delete chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="chat-panel__sessions-empty">
              No chats yet. Click <Plus size={12} /> or just type a message.
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-panel__main">
        {/* Header */}
        <div className="chat-panel__header">
          <span className="chat-panel__title">
            {activeSession?.title || 'Chat with your data'}
            <span className="text-muted"> · {catalog}</span>
          </span>
          <button className="btn btn--ghost btn--sm" onClick={resetConversation} title="Clear messages">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-panel__messages scrollable">
          {messages.length === 0 && (
            <div className="chat-panel__empty">
              <p>Ask questions about your Iceberg tables,</p>
              <p>explore schemas, or request data insights.</p>
              <div className="chat-panel__suggestions">
                <button className="chat-panel__suggestion" onClick={() => setInput('What tables do I have?')}>
                  What tables do I have?
                </button>
                <button className="chat-panel__suggestion" onClick={() => setInput('Describe the schema of ')}>
                  Describe schema…
                </button>
                <button className="chat-panel__suggestion" onClick={() => setInput('Show me a sample from ')}>
                  Show sample data…
                </button>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-panel__message chat-panel__message--${msg.role}`}>
              <div className="chat-panel__bubble">
                {msg.role === 'assistant' ? (
                  <div
                    className="chat-panel__markdown"
                    dangerouslySetInnerHTML={renderMarkdown(msg.content || (msg.isStreaming ? '…' : ''))}
                  />
                ) : (
                  <span>{msg.content}</span>
                )}
                {msg.isStreaming && (
                  <div className="chat-panel__tool-status">
                    {toolStatus && <span className="chat-panel__tool-label">{toolStatus}</span>}
                    {!msg.content && <Loader2 size={16} className="spin" />}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-panel__input-area">
          <textarea
            ref={inputRef}
            className="chat-panel__textarea input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={isStreaming}
          />
          <button
            className="btn btn--primary chat-panel__send"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
