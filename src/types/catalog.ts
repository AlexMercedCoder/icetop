// ============================================================
// Catalog types
// ============================================================

export interface CatalogNode {
  name: string;
  type: 'catalog' | 'namespace' | 'table';
  children?: CatalogNode[];
  fullyQualifiedName: string;
  isLoading?: boolean;
  isExpanded?: boolean;
}

export interface TableSchema {
  columns: SchemaColumn[];
  partitionSpec: string[];
  properties: Record<string, string>;
}

export interface SchemaColumn {
  name: string;
  type: string;
  required: boolean;
  doc?: string;
}

export interface Snapshot {
  snapshotId: string;
  timestamp: string;
  operation: string;
  summary: Record<string, string>;
}
