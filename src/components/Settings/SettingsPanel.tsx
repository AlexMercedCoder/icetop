import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { AppSettings, LLMProvider, DBBackend, Theme } from '../../types/settings';
import { Save, RotateCcw } from 'lucide-react';
import './Settings.scss';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, loadSettings, isLoaded } = useSettingsStore();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDraft(settings);
  };

  const updateLLM = (field: string, value: string) => {
    setDraft((d) => ({
      ...d,
      llm: { ...d.llm, [field]: value },
    }));
  };

  const updateDB = (field: string, value: string) => {
    setDraft((d) => ({
      ...d,
      database: { ...d.database, [field]: value },
    }));
  };

  return (
    <div className="settings-panel scrollable">
      <div className="settings-panel__header">
        <h2>Settings</h2>
        <div className="settings-panel__actions">
          {saved && <span className="text-success">✓ Saved</span>}
          <button className="btn btn--ghost btn--sm" onClick={handleReset}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            <Save size={14} /> Save
          </button>
        </div>
      </div>

      {/* LLM Configuration */}
      <section className="settings-section">
        <h3 className="settings-section__title">LLM Configuration</h3>
        <p className="settings-section__desc">
          Configure the AI provider for the Chat interface.
        </p>

        <div className="settings-field">
          <label className="settings-field__label">Provider</label>
          <select
            className="input"
            value={draft.llm.provider}
            onChange={(e) => updateLLM('provider', e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>

        <div className="settings-field">
          <label className="settings-field__label">API Key</label>
          <input
            className="input"
            type="password"
            value={draft.llm.apiKey}
            onChange={(e) => updateLLM('apiKey', e.target.value)}
            placeholder="Enter your API key…"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label">Model</label>
          <input
            className="input"
            value={draft.llm.model}
            onChange={(e) => updateLLM('model', e.target.value)}
            placeholder="e.g., gpt-4, claude-3-sonnet, gemini-pro"
          />
        </div>
      </section>

      {/* Database Backend */}
      <section className="settings-section">
        <h3 className="settings-section__title">Database Backend</h3>
        <p className="settings-section__desc">
          Choose persistence backend for query history, chat history, and notebooks.
        </p>

        <div className="settings-field">
          <label className="settings-field__label">Backend</label>
          <select
            className="input"
            value={draft.database.backend}
            onChange={(e) => updateDB('backend', e.target.value)}
          >
            <option value="sqlite">SQLite (local, zero-config)</option>
            <option value="postgres">PostgreSQL (shared, teams)</option>
          </select>
        </div>

        {draft.database.backend === 'sqlite' && (
          <div className="settings-field">
            <label className="settings-field__label">SQLite Path</label>
            <input
              className="input"
              value={draft.database.sqlitePath}
              onChange={(e) => updateDB('sqlitePath', e.target.value)}
              placeholder="~/.icetop/icetop.db"
            />
          </div>
        )}

        {draft.database.backend === 'postgres' && (
          <div className="settings-field">
            <label className="settings-field__label">PostgreSQL URI</label>
            <input
              className="input"
              value={draft.database.postgresUri}
              onChange={(e) => updateDB('postgresUri', e.target.value)}
              placeholder="postgresql://user:pass@host:5432/icetop"
            />
          </div>
        )}
      </section>

      {/* General */}
      <section className="settings-section">
        <h3 className="settings-section__title">General</h3>

        <div className="settings-field">
          <label className="settings-field__label">PyIceberg Config Path</label>
          <input
            className="input"
            value={draft.pyicebergConfigPath}
            onChange={(e) => setDraft((d) => ({ ...d, pyicebergConfigPath: e.target.value }))}
            placeholder="~/.pyiceberg.yaml"
          />
        </div>

        <div className="settings-field">
          <label className="settings-field__label">Python Path</label>
          <input
            className="input"
            value={draft.pythonPath}
            onChange={(e) => setDraft((d) => ({ ...d, pythonPath: e.target.value }))}
            placeholder="python3"
          />
        </div>

      <div className="settings-field">
          <label className="settings-field__label">Theme</label>
          <select
            className="input"
            value={draft.theme}
            onChange={(e) => setDraft((d) => ({ ...d, theme: e.target.value as Theme }))}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </section>
    </div>
  );
};
