import React, { useRef } from 'react';
import { useSQLStore } from '../../stores/sqlStore';
import { useCatalogStore } from '../../stores/catalogStore';
import Editor from '@monaco-editor/react';
import { Play, Plus, X, Download, Clock, Loader2 } from 'lucide-react';
import './SQL.scss';

export const SQLPanel: React.FC = () => {
  const { tabs, activeTabId, history, addTab, closeTab, setActiveTab, updateQuery, executeQuery } =
    useSQLStore();
  const catalogs = useCatalogStore((s) => s.catalogs);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tableName = e.dataTransfer.getData('text/icetop-table');
    if (tableName && activeTab) {
      updateQuery(activeTab.id, activeTab.query + tableName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && activeTab) {
      e.preventDefault();
      executeQuery(activeTab.id);
    }
  };

  const handleExportCSV = () => {
    if (!activeTab?.result) return;
    const rows = activeTab.result.rows;
    const cols = activeTab.result.columns.map((c) => c.name);
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sql-panel" onKeyDown={handleKeyDown}>
      {/* SQL Tab Bar */}
      <div className="sql-panel__tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`sql-panel__tab ${tab.id === activeTabId ? 'sql-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.title}</span>
            <button
              className="sql-panel__tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={() => addTab()}>
          <Plus size={14} />
        </button>
      </div>

      {activeTab && (
        <>
          {/* Toolbar */}
          <div className="sql-panel__toolbar">
            <button
              className="btn btn--primary"
              onClick={() => executeQuery(activeTab.id)}
              disabled={activeTab.isExecuting}
            >
              {activeTab.isExecuting ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Play size={14} />
              )}
              Run
            </button>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Ctrl+Enter to execute
            </span>
            <div style={{ flex: 1 }} />
            {activeTab.result && (
              <>
                <span className="text-muted" style={{ fontSize: '11px' }}>
                  {activeTab.result.rowCount} rows · {activeTab.result.executionTimeMs}ms
                </span>
                <button className="btn btn--ghost btn--sm" onClick={handleExportCSV}>
                  <Download size={14} />
                  CSV
                </button>
              </>
            )}
          </div>

          {/* Editor */}
          <div
            className="sql-panel__editor"
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
          >
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={activeTab.query}
              onChange={(value) => updateQuery(activeTab.id, value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          </div>

          {/* Results */}
          <div className="sql-panel__results scrollable">
            {activeTab.error && (
              <div className="sql-panel__error">
                <span className="text-error">{activeTab.error}</span>
              </div>
            )}
            {activeTab.result && (
              <table className="sql-panel__table">
                <thead>
                  <tr>
                    {activeTab.result.columns.map((col) => (
                      <th key={col.name}>
                        <span>{col.name}</span>
                        <span className="sql-panel__col-type">{col.type}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeTab.result.rows.map((row, i) => (
                    <tr key={i}>
                      {activeTab.result!.columns.map((col) => (
                        <td key={col.name}>{String(row[col.name] ?? 'null')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!activeTab.result && !activeTab.error && !activeTab.isExecuting && (
              <div className="sql-panel__placeholder">
                Write a SQL query and press <kbd>Ctrl+Enter</kbd> to execute
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
