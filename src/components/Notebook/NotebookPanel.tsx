import React from 'react';
import { useNotebookStore } from '../../stores/notebookStore';
import { Plus, Play, Trash2, ChevronUp, ChevronDown, FileCode, Type, Loader2 } from 'lucide-react';
import './Notebook.scss';

export const NotebookPanel: React.FC = () => {
  const { notebook, addCell, removeCell, updateCellSource, executeCell, moveCell, clearOutputs } =
    useNotebookStore();

  const handleDrop = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    const tableName = e.dataTransfer.getData('text/icetop-table');
    if (tableName) {
      const cell = notebook.cells.find((c) => c.id === cellId);
      if (cell) {
        updateCellSource(cellId, cell.source + `ice.read_table("${tableName}")`);
      }
    }
  };

  return (
    <div className="notebook-panel">
      <div className="notebook-panel__header">
        <span className="notebook-panel__title">{notebook.title}</span>
        <span className="text-muted">· {notebook.catalog}</span>
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
      </div>

      <div className="notebook-panel__cells scrollable">
        {notebook.cells.map((cell, idx) => (
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
                disabled={idx === notebook.cells.length - 1}
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
  );
};
