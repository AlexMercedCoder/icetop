import React from 'react';
import { useCatalogStore } from '../../stores/catalogStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Circle } from 'lucide-react';
import './StatusBar.scss';

export const StatusBar: React.FC = () => {
  const catalogs = useCatalogStore((s) => s.catalogs);
  const settings = useSettingsStore((s) => s.settings);

  const catalogCount = catalogs.length;
  const isConnected = catalogCount > 0;

  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span className={`status-bar__indicator ${isConnected ? 'status-bar__indicator--connected' : ''}`}>
          <Circle size={8} fill="currentColor" />
          {isConnected ? `${catalogCount} catalog${catalogCount > 1 ? 's' : ''}` : 'Disconnected'}
        </span>
      </div>
      <div className="status-bar__right">
        <span className="status-bar__item">
          LLM: {settings.llm.provider}
        </span>
        <span className="status-bar__item">
          Python: {settings.pythonPath}
        </span>
        <span className="status-bar__item">
          Theme: {settings.theme}
        </span>
      </div>
    </div>
  );
};
