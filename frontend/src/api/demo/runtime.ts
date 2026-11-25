// Only vite.demo.config.ts resolves the Wails runtime to this in-memory adapter.
// Keep Wails' pure model conversion and cancellation helpers without loading its desktop transport.
export * as Create from '../../../node_modules/@wailsio/runtime/dist/create.js'
export { CancellablePromise } from '../../../node_modules/@wailsio/runtime/dist/cancellable.js'
import { CancellablePromise } from '../../../node_modules/@wailsio/runtime/dist/cancellable.js'
import { currentLocale, isSupportedLocale, setLocale, t } from '../../i18n'
import { openConfirm } from '../confirms'
import { capabilities, connectionId, database, demoTables, drivers, profile, runSampleQuery, tableData } from './data'

setLocale('zh-CN')

type Listener = (event: { name: string; data: unknown }) => void
const listeners = new Map<string, Set<Listener>>()
export const Events = {
  On(name: string, callback: Listener) {
    const callbacks = listeners.get(name) ?? new Set<Listener>()
    callbacks.add(callback)
    listeners.set(name, callbacks)
    return () => { callbacks.delete(callback) }
  },
  Once(name: string, callback: Listener) {
    const off = Events.On(name, (event) => { off(); callback(event) })
    return off
  },
  async Emit(name: string, data: unknown) {
    for (const callback of listeners.get(name) ?? []) callback({ name, data })
    return true
  },
}

function notify(message = t('demo.unsupported')) {
  // Runtime callers often intentionally fire-and-forget native operations.
  // Resolve after an in-page notice so those actions never cause unhandled rejections.
  return openConfirm({ title: t('demo.title'), message,
    buttons: [{ value: 'ok', label: t('common.ok'), isDefault: true }] })
}

async function call(method: string, args: any[]) {
  const name = method.split('.').slice(-2).join('.')
  switch (name) {
    case 'SettingsService.GetLocale': return currentLocale()
    case 'SettingsService.SetLocale':
      if (isSupportedLocale(args[0])) setLocale(args[0])
      return
    case 'ConnectionService.ListDrivers': return drivers()
    case 'ConnectionService.ListConnections': return [profile()]
    case 'ConnectionService.ListGroups': return [{ id: 'demo', name: t('demo.group') }]
    case 'ConnectionService.ConnectedIDs': return [connectionId]
    case 'ConnectionService.GetConnection': return profile()
    case 'ConnectionService.IsConnected': return true
    case 'ConnectionService.GetServerInfo': return { version: 'SQLPort Demo', user: 'demo', database }
    case 'QueryService.CapabilitiesFor': return capabilities
    case 'QueryService.RunQuery': return runSampleQuery(args[1])
    case 'QueryService.CountQuery': return runSampleQuery(args[1]).rowsTotal
    case 'QueryService.Close': return
    case 'MetadataService.ListDatabases': return [database]
    case 'MetadataService.ListSchemas':
    case 'MetadataService.ListViews':
    case 'MetadataService.ListRoutines':
    case 'MetadataService.ListForeignKeys': return []
    case 'MetadataService.ListTables': return Object.entries(demoTables()).map(([name, data]) => ({
      name, rows: data.rows.length, comment: t('demo.sampleTable'), dataLength: 16384,
      options: { engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
    }))
    case 'MetadataService.ListColumns': return tableData(args[3]).columns
    case 'MetadataService.ListIndexes': return [{ name: 'PRIMARY', unique: true, primary: true,
      type: 'BTREE', columns: [{ name: 'id', seq: 1, order: 'ASC' }] }]
    case 'MetadataService.GetTableSummary': return { columns: tableData(args[3]).columns,
      indexes: [], foreignKeys: [] }
    case 'MetadataService.GetTableComment': return t('demo.sampleTable')
    case 'MetadataService.GetCreateTable': {
      const data = tableData(args[3])
      return `CREATE TABLE \`${args[3]}\` (\n${data.columns.map(c => `  \`${c.name}\` ${c.nativeType}${c.isPrimaryKey ? ' PRIMARY KEY' : ''}`).join(',\n')}\n);`
    }
    case 'MetadataService.AutocompleteFor': return { database, tables: Object.entries(demoTables()).map(([name, data]) => ({
      name, kind: 'table', columns: data.columns.map(c => ({ name: c.name, nativeType: c.nativeType })),
    })) }
    case 'MetadataService.CountTableRows': return tableData(args[3]).rows.length
    case 'MetadataService.BrowseTable': {
      const data = tableData(args[3])
      if (args[8] || args[9]) throw new Error(t('demo.unsupportedQuery'))
      let rows = [...data.rows]
      if (args[4]) {
        const col = data.columns.findIndex(c => c.name === args[4])
        if (col >= 0) rows.sort((a, b) => String(a[col]).localeCompare(String(b[col]), undefined, { numeric: true }) * (args[5] === 'DESC' ? -1 : 1))
      }
      return { columns: data.columns, rows: rows.slice(args[7], args[7] + args[6]),
        primaryKey: [], hasUniqueKey: false, sql: `SELECT * FROM \`${args[3]}\`;` }
    }
    case 'SavedQueryService.List': return []
    case 'AgentSettingsService.ListProviders':
    case 'AgentService.ListSessions': return []
    case 'AgentSettingsService.GetDefaults': return { providerID: '', model: '' }
    case 'AgentSettingsService.GetSettings': return {}
    case 'UpdateService.IsEnabled': return false
    case 'UpdateService.GetChannel': return 'stable'
    case 'UpdateService.GetSkippedVersion':
    case 'UpdateService.GetLastCheckDate': return ''
    case 'SystemService.SetDirtyTabs': return
    case 'SystemService.CopyToClipboard':
      try { await navigator.clipboard.writeText(args[0]) } catch { await notify() }
      return
    case 'SystemService.OpenExternalURL': window.open(args[0], '_blank', 'noopener,noreferrer'); return
    default:
      if (name.startsWith('SystemService.')) { await notify(); return }
      throw new Error(t('demo.unsupported'))
  }
}

export const Call = {
  ByName(method: string, ...args: any[]) {
    // Clone fixtures because generated model converters mutate their inputs in place.
    return CancellablePromise.resolve(call(method, args).then(value => structuredClone(value)))
  },
}

export const Window = {
  async Close() { window.location.hash = '#/' },
  async Minimise() { await notify() },
  async ToggleMaximise() { /* The host owns its window. */ },
  async IsMaximised() { return false },
}

async function messageDialog(options: any) {
  const buttons = options.Buttons?.map((b: any) => ({ value: b.Label, label: b.Label,
    isDefault: b.IsDefault, isCancel: b.IsCancel })) ?? [{ value: 'ok', label: t('common.ok') }]
  return openConfirm({ title: options.Title, message: options.Message, buttons })
}

export const Dialogs = {
  Info: messageDialog, Warning: messageDialog, Error: messageDialog,
  async SaveFile() { await notify(); return '' },
  async OpenFile() { await notify(); return '' },
}
