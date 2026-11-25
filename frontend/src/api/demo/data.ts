import { t } from '../../i18n'

export const connectionId = 'sqlport-local-demo'
export const database = 'sqlport_demo'
export const sampleSql = 'SELECT * FROM projects LIMIT 20;'

function column(name: string, nativeType: string, logicalType = 'string', primary = false) {
  return { name, nativeType, logicalType, nullable: false, isPrimaryKey: primary }
}

export function demoTables() {
  return {
    projects: {
      columns: [column('id', 'BIGINT', 'bigint', true), column('name', 'VARCHAR(120)'),
        column('department', 'VARCHAR(80)'), column('status', 'VARCHAR(30)'),
        column('budget', 'DECIMAL(12,2)', 'decimal'), column('updated_at', 'DATETIME', 'datetime')],
      rows: [
        [1, t('demo.project1'), t('demo.department1'), t('demo.inProgress'), 1280000, '2026-11-17 09:30:00'],
        [2, t('demo.project2'), t('demo.department2'), t('demo.inProgress'), 860000, '2026-11-17 10:15:00'],
        [3, t('demo.project3'), t('demo.department3'), t('demo.completed'), 2350000, '2026-11-16 16:20:00'],
        [4, t('demo.project4'), t('demo.department1'), t('demo.planned'), 680000, '2026-11-16 14:00:00'],
        [5, t('demo.project5'), t('demo.department2'), t('demo.inProgress'), 1580000, '2026-11-15 11:45:00'],
        [6, t('demo.project6'), t('demo.department3'), t('demo.completed'), 420000, '2026-11-14 17:30:00'],
      ],
    },
    tasks: {
      columns: [column('id', 'BIGINT', 'bigint', true), column('project_id', 'BIGINT', 'bigint'),
        column('title', 'VARCHAR(120)'), column('status', 'VARCHAR(30)'), column('due_date', 'DATE', 'date')],
      rows: [[1, 1, t('demo.task1'), t('demo.completed'), '2026-11-18'],
        [2, 1, t('demo.task2'), t('demo.inProgress'), '2026-11-20'],
        [3, 2, t('demo.task3'), t('demo.planned'), '2026-11-25']],
    },
    members: {
      columns: [column('id', 'BIGINT', 'bigint', true), column('name', 'VARCHAR(80)'),
        column('department', 'VARCHAR(80)'), column('role', 'VARCHAR(40)')],
      rows: [[1, 'Alex', t('demo.department1'), t('demo.owner')],
        [2, 'Lin', t('demo.department2'), t('demo.developer')],
        [3, 'Sam', t('demo.department3'), t('demo.analyst')]],
    },
  }
}

export function tableData(name: string) {
  const tables = demoTables()
  if (!Object.hasOwn(tables, name)) throw new Error(t('demo.unsupportedQuery'))
  return tables[name as keyof typeof tables]
}

export function profile() {
  return { id: connectionId, name: t('demo.connection'), driver: 'mysql', groupId: 'demo',
    environment: 'dev', host: 'demo.local', port: 3306, user: 'demo', database,
    createdAt: null, updatedAt: null }
}

export const capabilities = {
  schemas: false, storedProcedures: false, triggers: false, views: false,
  transactions: false, explainPlan: false, databaseEditor: false,
}

export function drivers() {
  return [{ name: 'mysql', version: 'demo', capabilities, schema: [], ui: {
    namespaceTerm: 'database', editorDialect: 'mysql', identQuote: '`',
    systemSchemas: [], keywords: ['SELECT', 'FROM', 'WHERE', 'LIMIT', 'ORDER BY', 'COUNT'],
    functions: [], snippets: [], typeGroups: [], typeFormats: {}, defaultColumnType: 'VARCHAR',
    defaultColumnParams: '255', hasUnsigned: false, primaryKeyForcesNotNull: true,
    autoIncrement: { supported: false, baseTypes: [], maxPerTable: 0 }, indexTypes: [],
  } }]
}

export function runSampleQuery(sql: string) {
  // Deliberately reject SQL outside the advertised samples instead of pretending to execute it.
  const match = /^\s*SELECT\s+(\*|COUNT\s*\(\s*\*\s*\))\s+FROM\s+(?:`?sqlport_demo`?\.)?`?(projects|tasks|members)`?(?:\s+LIMIT\s+(\d+))?\s*;?\s*$/i.exec(sql)
  if (!match) throw new Error(t('demo.unsupportedQuery'))
  const table = tableData(match[2].toLowerCase())
  const count = match[1] !== '*'
  const rows = count ? [[table.rows.length]] : table.rows.slice(0, match[3] ? Number(match[3]) : undefined)
  return { columns: count ? [column('COUNT(*)', 'BIGINT', 'bigint')] : table.columns,
    rows, rowsTotal: rows.length, done: true, truncated: false, elapsedMs: 3,
    isResultSet: true, statementCount: 1 }
}
