// ============================================================
// Notebook types
// ============================================================

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  source: string;
  output: CellOutput | null;
  isExecuting: boolean;
}

export interface CellOutput {
  text: string;
  error: string | null;
  data: unknown | null;
  executionTimeMs: number;
}

export interface Notebook {
  id: string;
  title: string;
  catalog: string;
  cells: NotebookCell[];
  savedAt: string | null;
  filePath: string | null;
}
