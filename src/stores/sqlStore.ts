import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { SQLTab, QueryResult, QueryHistoryItem } from '../types/sql';

interface SQLStore {
  tabs: SQLTab[];
  activeTabId: string;
  history: QueryHistoryItem[];

  addTab: (catalog?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateQuery: (tabId: string, query: string) => void;
  updateCatalog: (tabId: string, catalog: string) => void;
  executeQuery: (tabId: string) => Promise<void>;
  insertAtCursor: (tabId: string, text: string) => void;
  loadHistory: () => Promise<void>;
}

export const useSQLStore = create<SQLStore>((set, get) => {
  const defaultTab: SQLTab = {
    id: uuid(),
    title: 'Query 1',
    query: '',
    catalog: '',
    result: null,
    isExecuting: false,
    error: null,
  };

  return {
    tabs: [defaultTab],
    activeTabId: defaultTab.id,
    history: [],

    addTab: (catalog?: string) => {
      const tabs = get().tabs;
      const activeTab = tabs.find((t) => t.id === get().activeTabId);
      const effectiveCatalog = catalog || activeTab?.catalog || '';
      const newTab: SQLTab = {
        id: uuid(),
        title: `Query ${tabs.length + 1}`,
        query: '',
        catalog: effectiveCatalog,
        result: null,
        isExecuting: false,
        error: null,
      };
      set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
    },

    closeTab: (id) => {
      const tabs = get().tabs.filter((t) => t.id !== id);
      if (tabs.length === 0) {
        get().addTab();
        return;
      }
      const activeTabId = get().activeTabId === id ? tabs[0].id : get().activeTabId;
      set({ tabs, activeTabId });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateQuery: (tabId, query) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, query } : t)),
      }));
    },

    updateCatalog: (tabId, catalog) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, catalog } : t)),
      }));
    },

    executeQuery: async (tabId) => {
      const tab = get().tabs.find((t) => t.id === tabId);
      if (!tab || !tab.query.trim()) return;

      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, isExecuting: true, error: null, result: null } : t
        ),
      }));

      try {
        const result: QueryResult = await (window as any).icetop.sql.execute(
          tab.catalog,
          tab.query
        );

        const historyItem: QueryHistoryItem = {
          id: uuid(),
          query: tab.query,
          catalog: tab.catalog,
          timestamp: new Date().toISOString(),
          rowCount: result.rowCount,
          executionTimeMs: result.executionTimeMs,
          error: null,
        };

        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, result, isExecuting: false } : t
          ),
          history: [historyItem, ...state.history].slice(0, 100),
        }));
      } catch (err: any) {
        const errorMsg = err.message || 'Query execution failed';
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, error: errorMsg, isExecuting: false } : t
          ),
          history: [
            {
              id: uuid(),
              query: tab.query,
              catalog: tab.catalog,
              timestamp: new Date().toISOString(),
              rowCount: 0,
              executionTimeMs: 0,
              error: errorMsg,
            },
            ...state.history,
          ].slice(0, 100),
        }));
      }
    },

    insertAtCursor: (tabId, text) => {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, query: t.query + text } : t
        ),
      }));
    },

    loadHistory: async () => {
      try {
        const history: QueryHistoryItem[] = await (window as any).icetop.sql.getHistory();
        set({ history });
      } catch {
        // History not available yet
      }
    },
  };
});
