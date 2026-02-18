import React from 'react';
import { MessageSquare, Code2, BookOpen } from 'lucide-react';
import './TabBar.scss';

interface TabBarProps {
  activeView: string;
  onViewChange: (view: any) => void;
}

const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'sql', label: 'SQL', icon: Code2 },
  { id: 'notebook', label: 'Notebook', icon: BookOpen },
];

export const TabBar: React.FC<TabBarProps> = ({ activeView, onViewChange }) => {
  // Only show workspace tabs, not settings/docs (they're sidebar nav)
  const isWorkspaceView = tabs.some((t) => t.id === activeView);

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`tab-bar__tab ${
              activeView === tab.id ? 'tab-bar__tab--active' : ''
            }`}
            onClick={() => onViewChange(tab.id)}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </button>
        );
      })}
      {!isWorkspaceView && (
        <div className="tab-bar__indicator">
          <span className="text-muted">
            {activeView === 'settings' ? '⚙ Settings' : '📖 Docs'}
          </span>
        </div>
      )}
    </div>
  );
};
