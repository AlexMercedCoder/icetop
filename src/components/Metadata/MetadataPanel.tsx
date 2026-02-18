import React, { useState, useEffect } from 'react';
import { useCatalogStore } from '../../stores/catalogStore';
import {
  Table2, Columns3, Layers, Settings2, History,
  Loader2, ChevronRight, Search,
} from 'lucide-react';
import './Metadata.scss';

interface ColumnInfo {
  name: string;
  type: string;
  required: boolean;
  doc: string | null;
}

interface TableMeta {
  columns: ColumnInfo[];
  partitionSpec: string[];
  properties: Record<string, string>;
}

interface SnapshotInfo {
  snapshotId: string;
  timestamp: string;
  operation: string;
  summary: Record<string, string>;
}

type MetaTab = 'schema' | 'partitions' | 'properties' | 'snapshots';

export const MetadataPanel: React.FC = () => {
  const catalogs = useCatalogStore((s) => s.catalogs);
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [tableName, setTableName] = useState('');
  const [activeTab, setActiveTab] = useState<MetaTab>('schema');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [schemaFilter, setSchemaFilter] = useState('');

  // Default to first catalog
  useEffect(() => {
    if (catalogs.length > 0 && !selectedCatalog) {
      setSelectedCatalog(catalogs[0].name);
    }
  }, [catalogs]);

  const loadMetadata = async () => {
    if (!selectedCatalog || !tableName.trim()) return;
    setLoading(true);
    setError(null);
    setMeta(null);
    setSnapshots([]);

    try {
      const result = await (window as any).icetop.catalog.describeTable(
        selectedCatalog,
        tableName.trim()
      );
      setMeta(result);
      setSnapshots(result.snapshots || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load table metadata');
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') loadMetadata();
  };

  // Accept table drops – strip catalog prefix and auto-select catalog
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData('text/icetop-table');
    if (dropped) {
      // The fully qualified name starts with "catalogName.namespace.table"
      // Match against known catalogs and strip the prefix
      const catalogMatch = catalogs.find((c) => dropped.startsWith(c.name + '.'));
      if (catalogMatch) {
        setSelectedCatalog(catalogMatch.name);
        setTableName(dropped.slice(catalogMatch.name.length + 1));
      } else {
        setTableName(dropped);
      }
    }
  };

  const filteredColumns = meta?.columns.filter((c) =>
    c.name.toLowerCase().includes(schemaFilter.toLowerCase())
  );

  const metaTabs: { id: MetaTab; label: string; icon: React.ElementType }[] = [
    { id: 'schema', label: 'Schema', icon: Columns3 },
    { id: 'partitions', label: 'Partitions', icon: Layers },
    { id: 'properties', label: 'Properties', icon: Settings2 },
    { id: 'snapshots', label: 'Snapshots', icon: History },
  ];

  const formatTimestamp = (ms: string) => {
    try {
      return new Date(parseInt(ms)).toLocaleString();
    } catch {
      return ms;
    }
  };

  return (
    <div
      className="metadata-panel"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
    >
      {/* Header */}
      <div className="metadata-panel__header">
        <Table2 size={16} />
        <span className="metadata-panel__title">Table Metadata</span>
      </div>

      {/* Lookup bar */}
      <div className="metadata-panel__lookup">
        <select
          className="input metadata-panel__catalog-select"
          value={selectedCatalog}
          onChange={(e) => setSelectedCatalog(e.target.value)}
        >
          {catalogs.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <input
          className="input metadata-panel__table-input"
          type="text"
          placeholder="namespace.table_name (or drag from tree)"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn btn--primary metadata-panel__load-btn"
          onClick={loadMetadata}
          disabled={loading || !tableName.trim()}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
          <span>Load</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="metadata-panel__error">
          <span className="text-error">{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!meta && !loading && !error && (
        <div className="metadata-panel__empty">
          <Table2 size={32} />
          <p>Enter a fully qualified table name or drag one from the sidebar tree.</p>
          <p className="text-muted">Example: <code>my_namespace.my_table</code></p>
        </div>
      )}

      {/* Metadata content */}
      {meta && (
        <div className="metadata-panel__content">
          {/* Sub-tabs */}
          <div className="metadata-panel__tabs">
            {metaTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`metadata-panel__tab ${activeTab === tab.id ? 'metadata-panel__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {tab.id === 'schema' && (
                    <span className="metadata-panel__badge">{meta.columns.length}</span>
                  )}
                  {tab.id === 'partitions' && (
                    <span className="metadata-panel__badge">{meta.partitionSpec.length}</span>
                  )}
                  {tab.id === 'properties' && (
                    <span className="metadata-panel__badge">{Object.keys(meta.properties).length}</span>
                  )}
                  {tab.id === 'snapshots' && (
                    <span className="metadata-panel__badge">{snapshots.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="metadata-panel__tab-content scrollable">
            {/* Schema tab */}
            {activeTab === 'schema' && (
              <div className="metadata-panel__schema">
                <input
                  className="input metadata-panel__filter"
                  type="text"
                  placeholder="Filter columns…"
                  value={schemaFilter}
                  onChange={(e) => setSchemaFilter(e.target.value)}
                />
                <table className="metadata-panel__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredColumns || []).map((col, i) => (
                      <tr key={col.name}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="metadata-panel__col-name">{col.name}</td>
                        <td><code>{col.type}</code></td>
                        <td>{col.required ? '✓' : '—'}</td>
                        <td className="text-muted">{col.doc || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Partitions tab */}
            {activeTab === 'partitions' && (
              <div className="metadata-panel__partitions">
                {meta.partitionSpec.length === 0 ? (
                  <div className="metadata-panel__empty-tab">
                    <p className="text-muted">This table is not partitioned.</p>
                  </div>
                ) : (
                  <table className="metadata-panel__table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Partition Field</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meta.partitionSpec.map((field, i) => (
                        <tr key={i}>
                          <td className="text-muted">{i + 1}</td>
                          <td><code>{field}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Properties tab */}
            {activeTab === 'properties' && (
              <div className="metadata-panel__properties">
                {Object.keys(meta.properties).length === 0 ? (
                  <div className="metadata-panel__empty-tab">
                    <p className="text-muted">No table properties set.</p>
                  </div>
                ) : (
                  <table className="metadata-panel__table">
                    <thead>
                      <tr>
                        <th>Key</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(meta.properties)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => (
                          <tr key={key}>
                            <td><code>{key}</code></td>
                            <td>{value}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Snapshots tab */}
            {activeTab === 'snapshots' && (
              <div className="metadata-panel__snapshots">
                {snapshots.length === 0 ? (
                  <div className="metadata-panel__empty-tab">
                    <p className="text-muted">No snapshots available.</p>
                  </div>
                ) : (
                  <div className="metadata-panel__snapshot-list">
                    {snapshots.map((snap) => (
                      <div key={snap.snapshotId} className="metadata-panel__snapshot-card">
                        <div className="metadata-panel__snapshot-header">
                          <span className="metadata-panel__snapshot-op">{snap.operation}</span>
                          <span className="text-muted">{formatTimestamp(snap.timestamp)}</span>
                        </div>
                        <div className="metadata-panel__snapshot-id text-muted">
                          ID: {snap.snapshotId}
                        </div>
                        {Object.keys(snap.summary).length > 0 && (
                          <div className="metadata-panel__snapshot-summary">
                            {Object.entries(snap.summary).map(([k, v]) => (
                              <span key={k} className="metadata-panel__snapshot-tag">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
