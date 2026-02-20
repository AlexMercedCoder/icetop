import React, { useState, useEffect, useMemo } from 'react';
import { useCatalogStore } from '../../stores/catalogStore';
import {
  Table2, Columns3, Layers, Settings2, History,
  Loader2, ChevronRight, Search, FileText
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

interface TableFileInfo {
  file_path: string;
  file_format: string;
  record_count: number;
  file_size_in_bytes: number;
  partition: Record<string, string>;
}


type MetaTab = 'schema' | 'partitions' | 'properties' | 'snapshots' | 'files';

export const MetadataPanel: React.FC = () => {
  const catalogs = useCatalogStore((s) => s.catalogs);
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [tableName, setTableName] = useState('');
  const [activeTab, setActiveTab] = useState<MetaTab>('schema');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [files, setFiles] = useState<TableFileInfo[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [fileSort, setFileSort] = useState<{ key: keyof TableFileInfo; direction: 'asc' | 'desc' } | null>(null);
  const [groupByKeys, setGroupByKeys] = useState<string[]>([]);

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
    setFiles([]);
    setGroupByKeys([]);

    try {
      const result = await (window as any).icetop.catalog.describeTable(
        selectedCatalog,
        tableName.trim()
      );
      setMeta(result);
      setSnapshots(result.snapshots || []);

      const fileResult = await useCatalogStore.getState().getFiles(selectedCatalog, tableName.trim());
      setFiles(fileResult || []);
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
    c.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
    c.type.toLowerCase().includes(globalFilter.toLowerCase()) ||
    (c.doc && c.doc.toLowerCase().includes(globalFilter.toLowerCase()))
  );

  const metaTabs: { id: MetaTab; label: string; icon: React.ElementType }[] = [
    { id: 'schema', label: 'Schema', icon: Columns3 },
    { id: 'partitions', label: 'Partitions', icon: Layers },
    { id: 'properties', label: 'Properties', icon: Settings2 },
    { id: 'snapshots', label: 'Snapshots', icon: History },
    { id: 'files', label: 'Files', icon: FileText },
  ];

  const formatTimestamp = (ms: string) => {
    try {
      return new Date(parseInt(ms)).toLocaleString();
    } catch {
      return ms;
    }
  };

  const handleFileSort = (key: keyof TableFileInfo) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (fileSort && fileSort.key === key && fileSort.direction === 'asc') {
      direction = 'desc';
    }
    setFileSort({ key, direction });
  };

  const partitionKeys = useMemo(() => {
    const keys = new Set<string>();
    files.forEach(f => {
      if (f.partition && typeof f.partition === 'object') {
        Object.keys(f.partition).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [files]);

  const processedFiles = useMemo(() => {
    const lowerFilter = globalFilter.toLowerCase();
    let result = files.filter(f => {
      const pStr = f.partition ? JSON.stringify(f.partition).toLowerCase() : '';
      return f.file_path.toLowerCase().includes(lowerFilter) || pStr.includes(lowerFilter);
    });
    if (fileSort !== null) {
      result.sort((a, b) => {
        let valA: any = a[fileSort.key];
        let valB: any = b[fileSort.key];
        if (fileSort.key === 'partition') {
          valA = a.partition ? JSON.stringify(a.partition) : '';
          valB = b.partition ? JSON.stringify(b.partition) : '';
        }
        if (valA < valB) return fileSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return fileSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [files, globalFilter, fileSort]);

  const groupedFiles = useMemo(() => {
    if (groupByKeys.length === 0) return null;
    const groups: Record<string, typeof processedFiles> = {};
    processedFiles.forEach(f => {
      const gKey = groupByKeys.map(k => `${k}=${f.partition?.[k] ?? 'null'}`).join(', ');
      if (!groups[gKey]) groups[gKey] = [];
      groups[gKey].push(f);
    });
    return groups;
  }, [processedFiles, groupByKeys]);

  const renderFilesTable = (fileList: TableFileInfo[]) => (
    <table className="metadata-panel__table" style={{ margin: 0 }}>
      <thead>
        <tr>
          <th onClick={() => handleFileSort('file_path')} style={{ cursor: 'pointer' }}>
            Path {fileSort?.key === 'file_path' ? (fileSort.direction === 'asc' ? '↑' : '↓') : '↕'}
          </th>
          <th onClick={() => handleFileSort('file_format')} style={{ cursor: 'pointer' }}>
            Format {fileSort?.key === 'file_format' ? (fileSort.direction === 'asc' ? '↑' : '↓') : '↕'}
          </th>
          <th onClick={() => handleFileSort('record_count')} style={{ cursor: 'pointer' }}>
            Records {fileSort?.key === 'record_count' ? (fileSort.direction === 'asc' ? '↑' : '↓') : '↕'}
          </th>
          <th onClick={() => handleFileSort('file_size_in_bytes')} style={{ cursor: 'pointer' }}>
            Size (Bytes) {fileSort?.key === 'file_size_in_bytes' ? (fileSort.direction === 'asc' ? '↑' : '↓') : '↕'}
          </th>
          <th onClick={() => handleFileSort('partition')} style={{ cursor: 'pointer' }}>
            Partition {fileSort?.key === 'partition' ? (fileSort.direction === 'asc' ? '↑' : '↓') : '↕'}
          </th>
        </tr>
      </thead>
      <tbody>
        {fileList.map((f, i) => (
          <tr key={i}>
            <td style={{ wordBreak: 'break-all', fontSize: '12px' }}><code>{f.file_path}</code></td>
            <td><code>{f.file_format}</code></td>
            <td>{f.record_count.toLocaleString()}</td>
            <td>{f.file_size_in_bytes.toLocaleString()}</td>
            <td><code>{f.partition ? JSON.stringify(f.partition) : ''}</code></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

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
                  {tab.id === 'files' && (
                    <span className="metadata-panel__badge">{files.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="metadata-panel__tab-content scrollable">
            {/* Global filter box */}
            <div style={{ marginBottom: '12px', padding: '0 16px' }}>
              <input
                className="input metadata-panel__filter"
                type="text"
                placeholder="Filter current view by text..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                style={{ width: '100%', maxWidth: '100%' }}
              />
            </div>

            {/* Schema tab */}
            {activeTab === 'schema' && (
              <div className="metadata-panel__schema">
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
                      {meta.partitionSpec
                        .filter(f => f.toLowerCase().includes(globalFilter.toLowerCase()))
                        .map((field, i) => (
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
                        .filter(([k, v]) => k.toLowerCase().includes(globalFilter.toLowerCase()) || v.toLowerCase().includes(globalFilter.toLowerCase()))
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
                    {snapshots
                        .filter(s => s.snapshotId.toLowerCase().includes(globalFilter.toLowerCase()) || s.operation.toLowerCase().includes(globalFilter.toLowerCase()) || Object.values(s.summary).some(v => v.toLowerCase().includes(globalFilter.toLowerCase())))
                        .map((snap) => (
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

            {/* Files tab */}
            {activeTab === 'files' && (
              <div className="metadata-panel__files">
                {files.length === 0 ? (
                  <div className="metadata-panel__empty-tab">
                    <p className="text-muted">No files available or fetching failed.</p>
                  </div>
                ) : (
                  <div className="metadata-panel__files-content">
                    {/* Partition grouping controls */}
                    {partitionKeys.length > 0 && (
                      <div className="metadata-panel__group-controls" style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-color-light, #1e293b)', borderRadius: '6px' }}>
                        <span className="text-muted" style={{ marginRight: '16px', fontSize: '13px', fontWeight: 500 }}>Group by partition field:</span>
                        {partitionKeys.map(key => (
                          <label key={key} style={{ marginRight: '16px', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              style={{ marginRight: '6px', cursor: 'pointer' }}
                              checked={groupByKeys.includes(key)}
                              onChange={(e) => {
                                if (e.target.checked) setGroupByKeys(prev => [...prev, key]);
                                else setGroupByKeys(prev => prev.filter(k => k !== key));
                              }}
                            />
                            {key}
                          </label>
                        ))}
                      </div>
                    )}

                    {groupedFiles ? (
                      <div className="metadata-panel__grouped-files">
                        {Object.entries(groupedFiles).map(([grp, filesInGroup]) => (
                          <details key={grp} className="metadata-panel__group-details" open style={{ marginBottom: '12px', border: '1px solid var(--border-color, #334155)', borderRadius: '6px', overflow: 'hidden' }}>
                            <summary style={{ padding: '10px 16px', background: '#0f172a', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}>
                              <span style={{ color: 'var(--primary-color, #38bdf8)' }}>{grp}</span> 
                              <span className="text-muted" style={{ fontSize: '12px', marginLeft: '12px' }}>
                                ({filesInGroup.length} files, {filesInGroup.reduce((sum, f) => sum + f.file_size_in_bytes, 0).toLocaleString()} Bytes)
                              </span>
                            </summary>
                            <div style={{ borderTop: '1px solid var(--border-color, #334155)' }}>
                              {renderFilesTable(filesInGroup)}
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : (
                      renderFilesTable(processedFiles)
                    )}
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
