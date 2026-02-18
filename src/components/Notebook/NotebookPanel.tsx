import React, { useEffect, useState, useRef } from 'react';
import { useNotebookStore } from '../../stores/notebookStore';
import {
  Plus, Play, Trash2, ChevronUp, ChevronDown,
  FileCode, Type, Loader2, Package, ChevronRight,
  Download, FileText, Pencil,
} from 'lucide-react';
import './Notebook.scss';

interface PkgInfo {
  name: string;
  version: string;
}

export const NotebookPanel: React.FC = () => {
  const {
    notebooks, activeNotebookId, catalog,
    createNotebook, switchNotebook, deleteNotebook,
    renameNotebook, exportNotebook,
    addCell, removeCell, updateCellSource, executeCell,
    moveCell, clearOutputs,
  } = useNotebookStore();

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
  const cells = activeNotebook?.cells ?? [];

  // ── Rename state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [editingId]);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameNotebook(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  // ── Packages state ──
  const [packages, setPackages] = useState<PkgInfo[]>([]);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgFilter, setPkgFilter] = useState('');

  useEffect(() => {
    if (pkgOpen && packages.length === 0 && !pkgLoading) {
      setPkgLoading(true);
      (window as any).icetop.notebook
        .listPackages()
        .then((list: PkgInfo[]) => setPackages(list))
        .catch(() => setPackages([]))
        .finally(() => setPkgLoading(false));
    }
  }, [pkgOpen]);

  const filteredPkgs = pkgFilter
    ? packages.filter((p) => p.name.toLowerCase().includes(pkgFilter.toLowerCase()))
    : packages;

  // ── Drag & Drop ──
  const handleDrop = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    const tableName = e.dataTransfer.getData('text/icetop-table');
    if (tableName) {
      const cell = cells.find((c) => c.id === cellId);
      if (cell) {
        updateCellSource(cellId, cell.source + `ice.read_table("${tableName}")`);
      }
    }
  };

  return (
    <div className="notebook-panel">
      {/* Notebook sidebar */}
      <div className="notebook-panel__sidebar">
        <div className="notebook-panel__sidebar-header">
          <span>Notebooks</span>
          <button className="btn btn--ghost btn--sm" onClick={createNotebook} title="New notebook">
            <Plus size={14} />
          </button>
        </div>
        <div className="notebook-panel__sidebar-list scrollable">
          {notebooks.map((nb) => (
            <div
              key={nb.id}
              className={`notebook-panel__sidebar-item ${nb.id === activeNotebookId ? 'notebook-panel__sidebar-item--active' : ''}`}
              onClick={() => switchNotebook(nb.id)}
            >
              <FileText size={13} />
              {editingId === nb.id ? (
                <input
                  ref={renameRef}
                  className="notebook-panel__rename-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="notebook-panel__sidebar-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(nb.id, nb.title);
                  }}
                >
                  {nb.title}
                </span>
              )}
              <div className="notebook-panel__sidebar-actions">
                <button
                  className="notebook-panel__sidebar-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(nb.id, nb.title);
                  }}
                  title="Rename"
                >
                  <Pencil size={11} />
                </button>
                <button
                  className="notebook-panel__sidebar-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportNotebook(nb.id);
                  }}
                  title="Export as JSON"
                >
                  <Download size={11} />
                </button>
                <button
                  className="notebook-panel__sidebar-btn notebook-panel__sidebar-btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotebook(nb.id);
                  }}
                  title="Delete notebook"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main notebook area */}
      <div className="notebook-panel__main">
        <div className="notebook-panel__header">
          <span className="notebook-panel__title">
            {activeNotebook?.title || 'No notebook selected'}
          </span>
          <span className="text-muted">· {catalog}</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost btn--sm" onClick={clearOutputs}>
            Clear outputs
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => addCell('code')}>
            <Plus size={14} /> Code
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => addCell('markdown')}>
            <Plus size={14} /> Markdown
          </button>
          {activeNotebookId && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => exportNotebook(activeNotebookId)}
              title="Export notebook"
            >
              <Download size={14} /> Export
            </button>
          )}
        </div>

        {/* Python packages collapsible */}
        <div className="notebook-panel__packages">
          <button
            className="notebook-panel__packages-toggle"
            onClick={() => setPkgOpen(!pkgOpen)}
          >
            <ChevronRight
              size={14}
              className={`notebook-panel__packages-chevron ${pkgOpen ? 'notebook-panel__packages-chevron--open' : ''}`}
            />
            <Package size={14} />
            <span>Python Libraries ({packages.length > 0 ? packages.length : '…'})</span>
          </button>
          {pkgOpen && (
            <div className="notebook-panel__packages-body">
              <input
                className="notebook-panel__packages-search input"
                type="text"
                placeholder="Filter libraries…"
                value={pkgFilter}
                onChange={(e) => setPkgFilter(e.target.value)}
              />
              {pkgLoading ? (
                <div className="notebook-panel__packages-loading">
                  <Loader2 size={14} className="spin" /> Loading…
                </div>
              ) : (
                <div className="notebook-panel__packages-list scrollable">
                  {filteredPkgs.map((pkg) => (
                    <div key={pkg.name} className="notebook-panel__pkg-row">
                      <span className="notebook-panel__pkg-name">{pkg.name}</span>
                      <span className="notebook-panel__pkg-version">{pkg.version}</span>
                    </div>
                  ))}
                  {filteredPkgs.length === 0 && (
                    <div className="notebook-panel__packages-empty">No matching libraries</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cells */}
        <div className="notebook-panel__cells scrollable">
          {cells.map((cell, idx) => (
            <div
              key={cell.id}
              className={`notebook-cell notebook-cell--${cell.type}`}
              onDrop={(e) => handleDrop(e, cell.id)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
            >
              <div className="notebook-cell__gutter">
                <span className="notebook-cell__index">[{idx + 1}]</span>
                <span className="notebook-cell__type-icon">
                  {cell.type === 'code' ? <FileCode size={12} /> : <Type size={12} />}
                </span>
              </div>

              <div className="notebook-cell__content">
                <textarea
                  className="notebook-cell__editor"
                  value={cell.source}
                  onChange={(e) => updateCellSource(cell.id, e.target.value)}
                  placeholder={cell.type === 'code' ? '# Enter Python code…' : '# Enter Markdown…'}
                  rows={Math.max(3, cell.source.split('\n').length)}
                  spellCheck={false}
                />

                {cell.output && (
                  <div className="notebook-cell__output">
                    {cell.output.error ? (
                      <pre className="notebook-cell__error">{cell.output.error}</pre>
                    ) : (
                      <>
                        {cell.output.text && (
                          <pre className="notebook-cell__stdout">{cell.output.text}</pre>
                        )}
                        {cell.output.data && (
                          <div className="notebook-cell__data">
                            <pre>{JSON.stringify(cell.output.data, null, 2)}</pre>
                          </div>
                        )}
                      </>
                    )}
                    <span className="notebook-cell__timing text-muted">
                      {cell.output.executionTimeMs}ms
                    </span>
                  </div>
                )}
              </div>

              <div className="notebook-cell__actions">
                {cell.type === 'code' && (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => executeCell(cell.id)}
                    disabled={cell.isExecuting}
                    title="Run cell (Shift+Enter)"
                  >
                    {cell.isExecuting ? <Loader2 size={12} className="spin" /> : <Play size={12} />}
                  </button>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => moveCell(cell.id, 'up')}
                  disabled={idx === 0}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => moveCell(cell.id, 'down')}
                  disabled={idx === cells.length - 1}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => removeCell(cell.id)}
                  title="Delete cell"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <button
            className="notebook-panel__add-cell btn btn--ghost"
            onClick={() => addCell('code')}
          >
            <Plus size={14} /> Add cell
          </button>
        </div>
      </div>
    </div>
  );
};
