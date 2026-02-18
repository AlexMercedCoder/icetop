import React, { useCallback } from 'react';
import { useCatalogStore } from '../../stores/catalogStore';
import type { CatalogNode } from '../../types/catalog';
import { ChevronRight, Database, Folder, Table2, Loader2 } from 'lucide-react';
import './CatalogTree.scss';

interface CatalogTreeProps {
  node: CatalogNode;
  depth: number;
}

const iconForType = (type: CatalogNode['type']) => {
  switch (type) {
    case 'catalog':
      return <Database size={14} />;
    case 'namespace':
      return <Folder size={14} />;
    case 'table':
      return <Table2 size={14} />;
  }
};

export const CatalogTree: React.FC<CatalogTreeProps> = ({ node, depth }) => {
  const toggleExpanded = useCatalogStore((s) => s.toggleExpanded);
  const loadNamespaces = useCatalogStore((s) => s.loadNamespaces);
  const loadChildren = useCatalogStore((s) => s.loadChildren);
  const setSelectedNode = useCatalogStore((s) => s.setSelectedNode);

  const handleClick = useCallback(async () => {
    setSelectedNode(node);

    if (node.type === 'table') return;

    // Only fetch children if we haven't loaded them yet
    const needsLoad = !node.children || node.children.length === 0;

    // Toggle expansion
    toggleExpanded(node.fullyQualifiedName);

    if (needsLoad) {
      if (node.type === 'catalog') {
        await loadNamespaces(node.name);
      } else if (node.type === 'namespace') {
        // Use the fully qualified namespace path (minus the catalog prefix)
        const parts = node.fullyQualifiedName.split('.');
        const catalog = parts[0];
        const namespace = parts.slice(1).join('.');
        await loadChildren(catalog, namespace);
      }
    }
  }, [node, toggleExpanded, loadNamespaces, loadChildren, setSelectedNode]);

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type === 'table') {
      e.dataTransfer.setData('text/icetop-table', node.fullyQualifiedName);
      e.dataTransfer.setData('text/plain', node.fullyQualifiedName);
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  const hasChildren = node.type !== 'table';
  const isExpanded = node.isExpanded ?? false;
  const children = node.children ?? [];

  return (
    <div className="tree-item">
      <div
        className={`tree-node ${node.type === 'table' ? 'tree-node--draggable' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        draggable={node.type === 'table'}
        onDragStart={handleDragStart}
        title={node.fullyQualifiedName}
      >
        {hasChildren && (
          <ChevronRight
            size={12}
            className={`tree-node__chevron ${isExpanded ? 'tree-node__chevron--open' : ''}`}
          />
        )}
        {!hasChildren && <span className="tree-node__spacer" />}
        <span className={`tree-node__icon tree-node__icon--${node.type}`}>
          {node.isLoading ? <Loader2 size={14} className="tree-node__spinner" /> : iconForType(node.type)}
        </span>
        <span className="tree-node__label">{node.name}</span>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="tree-item__children">
          {children.map((child) => (
            <CatalogTree key={child.fullyQualifiedName} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
