import React, { useState, useEffect } from 'react';
import { ExternalLink, Book, Code, Database, Bot, Terminal } from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import './Docs.scss';

// Import markdown content as raw strings (Vite feature)
import docGettingStarted from '../../docs/01-getting-started.md?raw';
import docBrowsing from '../../docs/02-browsing-data.md?raw';
import docSQL from '../../docs/03-sql-queries.md?raw';
import docAI from '../../docs/04-ai-assistant.md?raw';
import docNotebooks from '../../docs/05-notebooks.md?raw';

const internalDocs = [
  { id: 'start', title: 'Getting Started', icon: <Book size={16} />, content: docGettingStarted },
  { id: 'browse', title: 'Browsing Data', icon: <Database size={16} />, content: docBrowsing },
  { id: 'sql', title: 'SQL Queries', icon: <Code size={16} />, content: docSQL },
  { id: 'ai', title: 'AI Assistant', icon: <Bot size={16} />, content: docAI },
  { id: 'notebook', title: 'Notebooks', icon: <Terminal size={16} />, content: docNotebooks },
];

const externalLinks = [
  { title: 'IceFrame GitHub', url: 'https://github.com/AlexMercedCoder/iceframe', desc: 'Source code and README' },
  { title: 'PyIceberg Configuration', url: 'https://py.iceberg.apache.org/configuration/', desc: 'PyIceberg YAML format' },
];

export const DocsPanel: React.FC = () => {
  const [activeDocId, setActiveDocId] = useState<string>('start');
  const activeDoc = internalDocs.find((d) => d.id === activeDocId);

  useEffect(() => {
    // Post-render highlighting
    hljs.highlightAll();
  }, [activeDocId]);

  const getHtml = (markdown: string) => {
    return { __html: marked.parse(markdown) as string };
  };

  return (
    <div className="docs-panel">
      <div className="docs-sidebar">
        <div className="docs-sidebar__header">
          <h2>Docs</h2>
        </div>
        <nav className="docs-sidebar__nav">
          {internalDocs.map((doc) => (
            <button
              key={doc.id}
              className={`docs-nav-item ${activeDocId === doc.id ? 'active' : ''}`}
              onClick={() => setActiveDocId(doc.id)}
            >
              {doc.icon}
              <span>{doc.title}</span>
            </button>
          ))}
        </nav>
        
        <div className="docs-sidebar__section">
          <h3>External Links</h3>
          {externalLinks.map((link) => (
            <a
              key={link.url}
              className="docs-nav-link"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{link.title}</span>
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </div>

      <div className="docs-content scrollable">
        {activeDoc && (
          <div 
            className="markdown-body" 
            dangerouslySetInnerHTML={getHtml(activeDoc.content)} 
          />
        )}
      </div>
    </div>
  );
};
