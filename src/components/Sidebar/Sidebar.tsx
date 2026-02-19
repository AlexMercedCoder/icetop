import React from 'react';
import { useCatalogStore } from '../../stores/catalogStore';
import { CatalogTree } from './CatalogTree';
import { BookOpen, Settings, ChevronLeft, Database } from 'lucide-react';
import './Sidebar.scss';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { catalogs, isLoading, error } = useCatalogStore();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        {!collapsed && (
          <div className="sidebar__brand">
            <Database size={20} className="sidebar__logo" />
            <span className="sidebar__title">IceTop</span>
          </div>
        )}
        <button
          className="btn btn--ghost btn--sm sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
          />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar__section-label">CATALOGS</div>
          <div className="sidebar__tree scrollable">
            {isLoading && (
              <div className="sidebar__status">Loading catalogs…</div>
            )}
            {error && (
              <div className="sidebar__status text-error">{error}</div>
            )}
            {!isLoading && catalogs.length === 0 && !error && (
              <div className="sidebar__status text-muted">
                No catalogs found in pyiceberg.yaml
              </div>
            )}
            {catalogs.map((catalog) => (
              <CatalogTree key={catalog.fullyQualifiedName} node={catalog} depth={0} />
            ))}
          </div>

          <div className="sidebar__footer">
            <a
              href="https://www.dremio.com/get-started/?utm_source=icetop_app&utm_medium=influencer&utm_campaign=iceberg&utm_term=icetop_app-02-19-2026&utm_content=alexmerced"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar__nav-btn sidebar__nav-btn--cta"
              title="Get a free Iceberg Catalog from Dremio"
            >
              <Database size={16} />
              <span>Get Free Catalog</span>
            </a>
            <button
              className={`sidebar__nav-btn ${activeView === 'docs' ? 'sidebar__nav-btn--active' : ''}`}
              onClick={() => onViewChange('docs')}
            >
              <BookOpen size={16} />
              <span>Docs</span>
            </button>
            <button
              className={`sidebar__nav-btn ${activeView === 'settings' ? 'sidebar__nav-btn--active' : ''}`}
              onClick={() => onViewChange('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
