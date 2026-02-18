import React from 'react';
import { ExternalLink } from 'lucide-react';
import './Docs.scss';

const docLinks = [
  { title: 'IceFrame GitHub', url: 'https://github.com/AlexMercedCoder/iceframe', desc: 'Source code and README' },
  { title: 'Creating Tables', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/creating_tables.md', desc: 'Create Iceberg tables' },
  { title: 'Reading Tables', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/reading_tables.md', desc: 'Read and scan data' },
  { title: 'Query Builder API', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/query_builder.md', desc: 'Fluent query API' },
  { title: 'SQL (DataFusion)', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/datafusion.md', desc: 'SQL query support' },
  { title: 'AI Agent', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/ai_agent.md', desc: 'Natural language chat' },
  { title: 'Notebook Integration', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/notebooks.md', desc: 'Jupyter magics' },
  { title: 'Schema Evolution', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/schema_evolution.md', desc: 'Add/drop/rename columns' },
  { title: 'Table Maintenance', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/maintenance.md', desc: 'Compaction, snapshots' },
  { title: 'Data Ingestion', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/ingestion.md', desc: 'Load data from files' },
  { title: 'Environment Variables', url: 'https://github.com/AlexMercedCoder/iceframe/blob/main/docs/variables.md', desc: 'Config reference' },
  { title: 'PyIceberg Configuration', url: 'https://py.iceberg.apache.org/configuration/', desc: 'PyIceberg YAML format' },
];

export const DocsPanel: React.FC = () => {
  return (
    <div className="docs-panel scrollable">
      <div className="docs-panel__header">
        <h2>Documentation</h2>
        <p className="text-muted">Quick reference to IceFrame and Apache Iceberg documentation.</p>
      </div>

      <div className="docs-panel__grid">
        {docLinks.map((link) => (
          <a
            key={link.url}
            className="docs-card"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="docs-card__title">
              {link.title}
              <ExternalLink size={12} />
            </div>
            <div className="docs-card__desc">{link.desc}</div>
          </a>
        ))}
      </div>

      <section className="docs-panel__quickstart">
        <h3>Quick Start</h3>
        <pre className="docs-panel__code">
{`from iceframe import IceFrame

# Initialize from pyiceberg.yaml
ice = IceFrame.from_catalog("dremio")

# Read a table
df = ice.read_table("testing.my_table")

# SQL query via DataFusion
df = ice.query_datafusion("SELECT * FROM my_table LIMIT 10")

# Query Builder
from iceframe.expressions import col
result = (ice.query("my_table")
    .filter(col("age") > 30)
    .select("name", "age")
    .execute())
`}
        </pre>
      </section>
    </div>
  );
};
