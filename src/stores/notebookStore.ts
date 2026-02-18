import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Notebook, NotebookCell, CellOutput } from '../types/notebook';

interface NotebookStore {
  notebooks: Notebook[];
  activeNotebookId: string | null;
  catalog: string;

  // Notebook management
  createNotebook: () => void;
  switchNotebook: (id: string) => void;
  deleteNotebook: (id: string) => void;
  renameNotebook: (id: string, title: string) => void;
  exportNotebook: (id: string) => void;

  // Cell operations (always on active notebook)
  addCell: (type?: 'code' | 'markdown', afterId?: string) => void;
  removeCell: (id: string) => void;
  updateCellSource: (id: string, source: string) => void;
  executeCell: (id: string) => Promise<void>;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  clearOutputs: () => void;

  setCatalog: (catalog: string) => void;
}

const createCell = (type: 'code' | 'markdown' = 'code'): NotebookCell => ({
  id: uuid(),
  type,
  source: '',
  output: null,
  isExecuting: false,
});

const makeNotebook = (catalog: string): Notebook => ({
  id: uuid(),
  title: 'Untitled Notebook',
  catalog,
  cells: [createCell()],
  savedAt: null,
  filePath: null,
});

// Helper: update a specific notebook in the list
const updateNb = (
  notebooks: Notebook[],
  id: string,
  updater: (nb: Notebook) => Notebook
): Notebook[] => notebooks.map((nb) => (nb.id === id ? updater(nb) : nb));

export const useNotebookStore = create<NotebookStore>((set, get) => {
  const initial = makeNotebook('dremio');
  return {
    notebooks: [initial],
    activeNotebookId: initial.id,
    catalog: 'dremio',

    // ── Notebook CRUD ───────────────────────────────

    createNotebook: () => {
      const nb = makeNotebook(get().catalog);
      set((state) => ({
        notebooks: [nb, ...state.notebooks],
        activeNotebookId: nb.id,
      }));
    },

    switchNotebook: (id) => set({ activeNotebookId: id }),

    deleteNotebook: (id) => {
      set((state) => {
        const notebooks = state.notebooks.filter((nb) => nb.id !== id);
        if (notebooks.length === 0) {
          const fresh = makeNotebook(state.catalog);
          return { notebooks: [fresh], activeNotebookId: fresh.id };
        }
        return {
          notebooks,
          activeNotebookId:
            state.activeNotebookId === id ? notebooks[0].id : state.activeNotebookId,
        };
      });
    },

    renameNotebook: (id, title) => {
      set((state) => ({
        notebooks: updateNb(state.notebooks, id, (nb) => ({ ...nb, title })),
      }));
    },

    exportNotebook: (id) => {
      const nb = get().notebooks.find((n) => n.id === id);
      if (!nb) return;

      // Build Jupyter .ipynb format (nbformat 4.5)
      const ipynbCells = nb.cells.map((c) => {
        const sourceLines = c.source.split('\n').map((line, i, arr) =>
          i < arr.length - 1 ? line + '\n' : line
        );

        if (c.type === 'markdown') {
          return {
            cell_type: 'markdown',
            metadata: {},
            source: sourceLines,
          };
        }

        // Code cell
        const outputs: any[] = [];
        if (c.output) {
          if (c.output.text) {
            outputs.push({
              output_type: 'stream',
              name: 'stdout',
              text: c.output.text.split('\n').map((line, i, arr) =>
                i < arr.length - 1 ? line + '\n' : line
              ),
            });
          }
          if (c.output.error) {
            outputs.push({
              output_type: 'error',
              ename: 'Error',
              evalue: c.output.error,
              traceback: c.output.error.split('\n'),
            });
          }
        }

        return {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          source: sourceLines,
          outputs,
        };
      });

      const ipynb = {
        nbformat: 4,
        nbformat_minor: 5,
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3',
          },
          language_info: {
            name: 'python',
            version: '3.11.0',
          },
        },
        cells: ipynbCells,
      };

      const blob = new Blob([JSON.stringify(ipynb, null, 1)], {
        type: 'application/x-ipynb+json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nb.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ipynb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // ── Cell operations ─────────────────────────────

    addCell: (type = 'code', afterId) => {
      const cell = createCell(type);
      const { activeNotebookId } = get();
      if (!activeNotebookId) return;
      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => {
          const cells = [...nb.cells];
          if (afterId) {
            const idx = cells.findIndex((c) => c.id === afterId);
            cells.splice(idx + 1, 0, cell);
          } else {
            cells.push(cell);
          }
          return { ...nb, cells };
        }),
      }));
    },

    removeCell: (id) => {
      const { activeNotebookId } = get();
      if (!activeNotebookId) return;
      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => {
          const cells = nb.cells.filter((c) => c.id !== id);
          if (cells.length === 0) cells.push(createCell());
          return { ...nb, cells };
        }),
      }));
    },

    updateCellSource: (id, source) => {
      const { activeNotebookId } = get();
      if (!activeNotebookId) return;
      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => ({
          ...nb,
          cells: nb.cells.map((c) => (c.id === id ? { ...c, source } : c)),
        })),
      }));
    },

    executeCell: async (id) => {
      const { activeNotebookId, notebooks } = get();
      if (!activeNotebookId) return;
      const nb = notebooks.find((n) => n.id === activeNotebookId);
      if (!nb) return;
      const cell = nb.cells.find((c) => c.id === id);
      if (!cell || cell.type !== 'code') return;

      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => ({
          ...nb,
          cells: nb.cells.map((c) =>
            c.id === id ? { ...c, isExecuting: true, output: null } : c
          ),
        })),
      }));

      try {
        const result: CellOutput = await (window as any).icetop.notebook.executeCell(
          nb.catalog,
          cell.source
        );
        set((state) => ({
          notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => ({
            ...nb,
            cells: nb.cells.map((c) =>
              c.id === id ? { ...c, output: result, isExecuting: false } : c
            ),
          })),
        }));
      } catch (err: any) {
        set((state) => ({
          notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => ({
            ...nb,
            cells: nb.cells.map((c) =>
              c.id === id
                ? {
                    ...c,
                    isExecuting: false,
                    output: {
                      text: '',
                      error: err.message || 'Execution failed',
                      data: null,
                      executionTimeMs: 0,
                    },
                  }
                : c
            ),
          })),
        }));
      }
    },

    moveCell: (id, direction) => {
      const { activeNotebookId } = get();
      if (!activeNotebookId) return;
      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => {
          const cells = [...nb.cells];
          const idx = cells.findIndex((c) => c.id === id);
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= cells.length) return nb;
          [cells[idx], cells[targetIdx]] = [cells[targetIdx], cells[idx]];
          return { ...nb, cells };
        }),
      }));
    },

    clearOutputs: () => {
      const { activeNotebookId } = get();
      if (!activeNotebookId) return;
      set((state) => ({
        notebooks: updateNb(state.notebooks, activeNotebookId, (nb) => ({
          ...nb,
          cells: nb.cells.map((c) => ({ ...c, output: null, isExecuting: false })),
        })),
      }));
    },

    setCatalog: (catalog) => set({ catalog }),
  };
});

// Legacy compatibility: expose a `notebook` getter for any code that expects `store.notebook`
// (Shouldn't be needed after component updates, but just in case)
