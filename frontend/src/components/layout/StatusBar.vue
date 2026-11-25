<script setup lang="ts">
// StatusBar — bottom strip (DESIGN.md). Follows the workspace's active
// connection (passed down from AppShell) and its current database. Shows
// connection name, connection status, current database, server version/user,
// theme mode, and build tag.
import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { connections as connectionsApi } from '../../api'
import { useConnectionsStore } from '../../stores/connections'
import { useQueryStore } from '../../stores/query'
import { useThemeStore } from '../../stores/theme'
import { useUpdatesStore } from '../../stores/updates'
import { t } from '../../i18n'
import type { ConnectionProfile, ServerInfo } from '../../api/connections'

const props = defineProps<{ activeConn: ConnectionProfile | null }>()

const conns = useConnectionsStore()
const queryStore = useQueryStore()
const theme = useThemeStore()
const updates = useUpdatesStore()
const message = useMessage()

const serverInfo = ref<ServerInfo | null>(null)
const checking = ref(false)

const isLive = computed(() => !!props.activeConn && conns.liveIds.has(props.activeConn.id))

// Current database: the active tab's db, falling back to the object tree's
// last-selected database for this connection.
const currentDb = computed(() => {
  const c = props.activeConn
  if (!c) return null
  return queryStore.activeTab(c.id)?.db || queryStore.selectedDb[c.id] || null
})

// Fetch server info when the live active connection changes — this covers
// switching connections and a selected connection going live/offline.
const liveConnId = computed(() => (isLive.value ? props.activeConn!.id : null))
watch(liveConnId, async (id) => {
  if (!id) { serverInfo.value = null; return }
  try {
    serverInfo.value = await connectionsApi.getServerInfo(id)
  } catch {
    // connection may not be fully live yet, that's fine
    serverInfo.value = null
  }
}, { immediate: true })

const mode = computed(() => (theme.mode === 'dark' ? 'statusBar.themeDark' : 'statusBar.themeLight'))
const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

// Click handler on the version slot: if an update is already known, open the
// dialog directly; otherwise trigger a fresh check and toast the outcome.
// The dialog ONLY opens when a genuinely newer version is found — otherwise
// we'd be showing "发现新版本" with the current version, which is the bug.
async function onVersionClick() {
  if (updates.hasBadge) {
    updates.openDialog()
    return
  }
  if (checking.value) return
  checking.value = true
  try {
    const found = await updates.check(true)
    if (found) {
      updates.openDialog()
      return
    }
    if (updates.lastError) {
      message.error(t('statusBar.checkUpdateFailed', { error: updates.lastError }))
      return
    }
    if (updates.skipped) {
      message.info(t('statusBar.versionSkipped', { version: updates.latestVersion }))
      return
    }
    message.success(t('statusBar.upToDate', { version: updates.currentVersion }))
  } finally {
    checking.value = false
  }
}

const versionTitle = computed(() => {
  if (updates.hasBadge) return t('statusBar.viewNewVersion', { version: updates.latestVersion })
  return t('statusBar.checkForUpdates')
})
</script>

<template>
  <div class="bar">
    <span class="slot mono">{{ activeConn ? activeConn.name : $t('statusBar.noConnection') }}</span>
    <span class="sep" />
    <span class="slot">{{ isLive ? $t('statusBar.connected') : $t('statusBar.disconnected') }}</span>
    <!-- 当前数据库槽位（暂时隐藏）
    <span v-if="currentDb" class="sep" />
    <span v-if="currentDb" class="slot mono">{{ currentDb }}</span>
    -->

    <span v-if="serverInfo" class="sep" />
    <span v-if="serverInfo" class="slot mono">{{ serverInfo.version }}</span>
    <span v-if="serverInfo" class="sep" />
    <span v-if="serverInfo" class="slot mono">{{ serverInfo.user }}</span>
    <span class="grow" />
    <span class="slot mono">{{ $t(mode) }}</span>
    <span class="sep" />
    <button
      v-if="updates.enabled"
      type="button"
      class="version-btn"
      :class="{ 'has-update': updates.hasBadge, checking: checking }"
      :title="versionTitle"
      @click="onVersionClick"
    >
      <span class="mono">sqlport v{{ appVersion }}</span>
      <span v-if="updates.hasBadge" class="badge" aria-hidden="true" />
    </button>
    <span v-else class="slot mono">sqlport v{{ appVersion }}</span>
  </div>
</template>

<style scoped>
/* DESIGN.md statusbar 规格：高 24px，文字 small + text-secondary。 */
.bar {
  display: flex;
  align-items: center;
  height: var(--sqlport-statusbar-height);
  font-size: var(--sqlport-fs-small);
  color: var(--sqlport-text-secondary);
  background: var(--sqlport-surface-chrome);
  padding: 0 18px;
  gap: 8px;
}
.slot { white-space: nowrap; }
.sep { width: 1px; height: 12px; background: currentColor; opacity: 0.15; }
.grow { flex: 1 1 auto; }

.version-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
  margin: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: default;
  white-space: nowrap;
  opacity: 0.9;
}
.version-btn:hover { opacity: 1; }
.version-btn.has-update { color: var(--sqlport-warning); opacity: 1; }
.version-btn.checking { opacity: 0.6; }

.badge {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sqlport-warning);
  box-shadow: 0 0 0 1px var(--sqlport-surface-chrome);
}
</style>
