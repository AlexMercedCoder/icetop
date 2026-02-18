import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Notebook, NotebookCell, CellOutput } from '../types/notebook';

interface NotebookStore {
  notebook: Notebook;

  addCell: (type?: 'code' | 'markdown', afterId?: string) => void;
  removeCell: (id: string) => void;
  updateCellSource: (id: string, source: string) => void;
  executeCell: (id: string) => Promise<void>;
  setCatalog: (catalog: string) => void;
  setTitle: (title: string) => void;
  moveCell: (id: string, direction: 'up' | 'down') => void;
  clearOutputs: () => void;
}

const createCell = (type: 'code' | 'markdown' = 'code'): NotebookCell => ({
  id: uuid(),
  type,
  source: '',
  output: null,
  isExecuting: false,
});

export const useNotebookStore = create<NotebookStore>((set, get) => ({
  notebook: {
    id: uuid(),
    title: 'Untitled Notebook',
    catalog: 'dremio',
    cells: [createCell()],
    savedAt: null,
    filePath: null,
  },

  addCell: (type = 'code', afterId) => {
    const cell = createCell(type);
    set((state) => {
      const cells = [...state.notebook.cells];
      if (afterId) {
        const idx = cells.findIndex((c) => c.id === afterId);
        cells.splice(idx + 1, 0, cell);
      } else {
        cells.push(cell);
      }
      return { notebook: { ...state.notebook, cells } };
    });
  },

  removeCell: (id) => {
    set((state) => {
      const cells = state.notebook.cells.filter((c) => c.id !== id);
      if (cells.length === 0) cells.push(createCell());
      return { notebook: { ...state.notebook, cells } };
    });
  },

  updateCellSource: (id, source) => {
    set((state) => ({
      notebook: {
        ...state.notebook,
        cells: state.notebook.cells.map((c) =>
          c.id === id ? { ...c, source } : c
        ),
      },
    }));
  },

  executeCell: async (id) => {
    const notebook = get().notebook;
    const cell = notebook.cells.find((c) => c.id === id);
    if (!cell || cell.type !== 'code') return;

    set((state) => ({
      notebook: {
        ...state.notebook,
        cells: state.notebook.cells.map((c) =>
          c.id === id ? { ...c, isExecuting: true, output: null } : c
        ),
      },
    }));

    try {
      const result: CellOutput = await (window as any).icetop.notebook.executeCell(
        notebook.catalog,
        cell.source
      );

      set((state) => ({
        notebook: {
          ...state.notebook,
          cells: state.notebook.cells.map((c) =>
            c.id === id ? { ...c, output: result, isExecuting: false } : c
          ),
        },
      }));
    } catch (err: any) {
      set((state) => ({
        notebook: {
          ...state.notebook,
          cells: state.notebook.cells.map((c) =>
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
        },
      }));
    }
  },

  setCatalog: (catalog) => {
    set((state) => ({ notebook: { ...state.notebook, catalog } }));
  },

  setTitle: (title) => {
    set((state) => ({ notebook: { ...state.notebook, title } }));
  },

  moveCell: (id, direction) => {
    set((state) => {
      const cells = [...state.notebook.cells];
      const idx = cells.findIndex((c) => c.id === id);
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= cells.length) return state;
      [cells[idx], cells[targetIdx]] = [cells[targetIdx], cells[idx]];
      return { notebook: { ...state.notebook, cells } };
    });
  },

  clearOutputs: () => {
    set((state) => ({
      notebook: {
        ...state.notebook,
        cells: state.notebook.cells.map((c) => ({
          ...c,
          output: null,
          isExecuting: false,
        })),
      },
    }));
  },
}));
