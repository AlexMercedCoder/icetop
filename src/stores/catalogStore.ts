import { create } from 'zustand';
import type { CatalogNode, TableSchema, Snapshot } from '../types/catalog';

interface CatalogStore {
  catalogs: CatalogNode[];
  selectedNode: CatalogNode | null;
  isLoading: boolean;
  error: string | null;

  setCatalogs: (catalogs: CatalogNode[]) => void;
  setSelectedNode: (node: CatalogNode | null) => void;
  toggleExpanded: (fullyQualifiedName: string) => void;
  setChildren: (parentFQN: string, children: CatalogNode[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions (call IPC)
  loadCatalogs: () => Promise<void>;
  loadNamespaces: (catalog: string) => Promise<void>;
  loadChildren: (catalog: string, namespace: string) => Promise<void>;
  describeTable: (catalog: string, table: string) => Promise<TableSchema | null>;
  getSnapshots: (catalog: string, table: string) => Promise<Snapshot[]>;
}

const updateNodeInTree = (
  nodes: CatalogNode[],
  fqn: string,
  updater: (node: CatalogNode) => CatalogNode
): CatalogNode[] => {
  return nodes.map((node) => {
    if (node.fullyQualifiedName === fqn) {
      return updater(node);
    }
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, fqn, updater) };
    }
    return node;
  });
};

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  catalogs: [],
  selectedNode: null,
  isLoading: false,
  error: null,

  setCatalogs: (catalogs) => set({ catalogs }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  toggleExpanded: (fqn) => {
    set((state) => ({
      catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
        ...node,
        isExpanded: !node.isExpanded,
      })),
    }));
  },

  setChildren: (parentFQN, children) => {
    set((state) => ({
      catalogs: updateNodeInTree(state.catalogs, parentFQN, (node) => ({
        ...node,
        children,
        isLoading: false,
      })),
    }));
  },

  loadCatalogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const names: string[] = await (window as any).icetop.catalog.listCatalogs();
      const catalogs: CatalogNode[] = names.map((name) => ({
        name,
        type: 'catalog' as const,
        fullyQualifiedName: name,
        children: [],
        isExpanded: false,
      }));
      set({ catalogs, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load catalogs', isLoading: false });
    }
  },

  loadNamespaces: async (catalog) => {
    const fqn = catalog;
    set((state) => ({
      catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
        ...node,
        isLoading: true,
      })),
    }));
    try {
      const names: string[] = await (window as any).icetop.catalog.listNamespaces(catalog);
      const children: CatalogNode[] = names.map((name) => ({
        name,
        type: 'namespace' as const,
        fullyQualifiedName: `${catalog}.${name}`,
        children: [],
        isExpanded: false,
      }));
      // Force expand the parent when children arrive
      set((state) => ({
        catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
          ...node,
          children,
          isLoading: false,
          isExpanded: true,
        })),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to load namespaces' });
      set((state) => ({
        catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
          ...node,
          isLoading: false,
        })),
      }));
    }
  },

  loadChildren: async (catalog, namespace) => {
    const fqn = `${catalog}.${namespace}`;
    set((state) => ({
      catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
        ...node,
        isLoading: true,
      })),
    }));
    try {
      const result: { namespaces: string[]; tables: string[] } =
        await (window as any).icetop.catalog.listChildren(catalog, namespace);

      const children: CatalogNode[] = [
        // Sub-namespaces first (expandable)
        ...result.namespaces.map((name) => ({
          name,
          type: 'namespace' as const,
          fullyQualifiedName: `${catalog}.${namespace}.${name}`,
          children: [] as CatalogNode[],
          isExpanded: false,
        })),
        // Then tables (leaf nodes)
        ...result.tables.map((name) => ({
          name,
          type: 'table' as const,
          fullyQualifiedName: `${catalog}.${namespace}.${name}`,
        })),
      ];

      set((state) => ({
        catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
          ...node,
          children,
          isLoading: false,
          isExpanded: true,
        })),
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to load children' });
      set((state) => ({
        catalogs: updateNodeInTree(state.catalogs, fqn, (node) => ({
          ...node,
          isLoading: false,
        })),
      }));
    }
  },

  describeTable: async (catalog, table) => {
    try {
      return await (window as any).icetop.catalog.describeTable(catalog, table);
    } catch {
      return null;
    }
  },

  getSnapshots: async (catalog, table) => {
    try {
      return await (window as any).icetop.catalog.getSnapshots(catalog, table);
    } catch {
      return [];
    }
  },
}));
