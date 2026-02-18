import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatPanel } from './components/Chat/ChatPanel';
import { SQLPanel } from './components/SQL/SQLPanel';
import { NotebookPanel } from './components/Notebook/NotebookPanel';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { DocsPanel } from './components/Docs/DocsPanel';
import { StatusBar } from './components/shared/StatusBar';
import { TabBar } from './components/shared/TabBar';
import { useCatalogStore } from './stores/catalogStore';
import { useSettingsStore } from './stores/settingsStore';
import './App.scss';

type WorkspaceView = 'chat' | 'sql' | 'notebook' | 'settings' | 'docs';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<WorkspaceView>('sql');
  const loadCatalogs = useCatalogStore((s) => s.loadCatalogs);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
    loadCatalogs();
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Drag-and-drop handled by individual panels
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const renderPanel = () => {
    switch (activeView) {
      case 'chat':
        return <ChatPanel />;
      case 'sql':
        return <SQLPanel />;
      case 'notebook':
        return <NotebookPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'docs':
        return <DocsPanel />;
      default:
        return <SQLPanel />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div
        className="app__main"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <TabBar activeView={activeView} onViewChange={setActiveView} />
        <div className="app__content">
          {renderPanel()}
        </div>
        <StatusBar />
      </div>
    </div>
  );
};

export default App;
