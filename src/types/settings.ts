// ============================================================
// Settings types
// ============================================================

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';
export type DBBackend = 'sqlite' | 'postgres';
export type Theme = 'dark' | 'light' | 'iceberg' | 'midnight';

export interface LLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export interface DatabaseSettings {
  backend: DBBackend;
  sqlitePath: string;
  postgresUri: string;
}

export interface AppSettings {
  llm: LLMSettings;
  database: DatabaseSettings;
  pyicebergConfigPath: string;
  pythonPath: string;
  theme: Theme;
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
  },
  database: {
    backend: 'sqlite',
    sqlitePath: '~/.icetop/icetop.db',
    postgresUri: '',
  },
  pyicebergConfigPath: '~/.pyiceberg.yaml',
  pythonPath: 'python3',
  theme: 'midnight',
};
