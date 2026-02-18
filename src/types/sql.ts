// ============================================================
// SQL types
// ============================================================

export interface SQLTab {
  id: string;
  title: string;
  query: string;
  catalog: string;
  result: QueryResult | null;
  isExecuting: boolean;
  error: string | null;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryColumn {
  name: string;
  type: string;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  catalog: string;
  timestamp: string;
  rowCount: number;
  executionTimeMs: number;
  error: string | null;
}
