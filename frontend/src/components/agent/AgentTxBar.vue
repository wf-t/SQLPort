<script setup lang="ts">
// AgentTxBar — the pending-transaction bar (§5 gate 5). Lives above the
// composer, NOT in the message stream: a task's DML runs inside one tx and
// stays uncommitted until the user commits or rolls back. Shows the statement
// count + total affected rows; expands to per-statement detail. While a
// commit/rollback call is in flight the buttons disable (busy).
import { computed, ref } from 'vue'
import AppIcon from '../shared/AppIcon.vue'
import chevronDownIcon from '../../assets/icons/chevron-down.svg?raw'
import { highlightSql } from './markdown'
import type { TxStmt } from '../../api/agent'

const props = defineProps<{ statements: TxStmt[]; busy: boolean }>()
const emit = defineEmits<{ (e: 'commit'): void; (e: 'rollback'): void }>()

const expanded = ref(false)
const totalRows = computed(() => props.statements.reduce((n, s) => n + (s.rows ?? 0), 0))
const detail = computed(() => props.statements.map((s) => ({ rows: s.rows ?? 0, html: highlightSql(s.sql) })))
</script>

<template>
  <div class="tx-bar">
    <div class="summary">
      <button type="button" class="toggle" @click="expanded = !expanded">
        <AppIcon :src="chevronDownIcon" :size="12" class="caret" :class="{ open: expanded }" />
        <span class="label">{{ $t('agent.tx.pending', { n: statements.length, rows: totalRows }) }}</span>
      </button>
      <span class="spacer" />
      <button type="button" class="btn ghost" :disabled="busy" @click="emit('rollback')">{{ $t('agent.tx.rollback') }}</button>
      <button type="button" class="btn primary" :disabled="busy" @click="emit('commit')">{{ $t('agent.tx.commit') }}</button>
    </div>
    <div v-if="expanded" class="detail">
      <div v-for="(s, i) in detail" :key="i" class="stmt">
        <pre class="sql mono"><code v-html="s.html" /></pre>
        <span class="rows">{{ $t('agent.tx.rowsAffected', { n: s.rows }) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tx-bar {
  flex: 0 0 auto;
  margin: 0 8px 6px;
  border: 1px solid var(--sqlport-warning);
  border-radius: var(--sqlport-rounded-sm);
  background: color-mix(in srgb, var(--sqlport-warning) 8%, transparent);
  overflow: hidden;
}
.summary { display: flex; align-items: center; gap: 6px; padding: 5px 6px; }
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  font: inherit;
  color: var(--sqlport-text-primary);
  cursor: default;
  padding: 0;
  min-width: 0;
}
/* Collapsed points right (>), expanded points down (v). */
.caret { transition: transform 130ms ease-out; opacity: 0.6; flex: 0 0 auto; transform: rotate(-90deg); }
.caret.open { transform: rotate(0deg); }
.label { font-size: var(--sqlport-fs-small); font-weight: 600; }
.spacer { flex: 1 1 0; }

.btn {
  border: 1px solid var(--sqlport-control-border);
  background: var(--sqlport-surface-content);
  color: var(--sqlport-text-primary);
  font: inherit;
  font-size: var(--sqlport-fs-small);
  height: 22px;
  padding: 0 10px;
  border-radius: var(--sqlport-rounded-sm);
  cursor: default;
  transition: background 130ms ease-out;
}
.btn:hover { background: var(--sqlport-hover-fill); }
.btn:disabled { opacity: 0.5; }
.btn.primary { border-color: transparent; background: var(--sqlport-accent); color: var(--sqlport-text-on-accent); }
.btn.primary:hover { background: var(--sqlport-accent-pressed); }
.btn.ghost { border-color: transparent; background: transparent; color: var(--sqlport-text-secondary); }
.btn.ghost:hover { background: var(--sqlport-hover-fill); color: var(--sqlport-text-primary); }

.detail {
  border-top: 1px solid color-mix(in srgb, var(--sqlport-warning) 30%, transparent);
  padding: 6px 8px;
  max-height: 180px;
  overflow: auto;
}
.stmt { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
.sql {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 3px 6px;
  border-radius: var(--sqlport-rounded-xs);
  background: var(--sqlport-surface-content);
  overflow-x: auto;
  font-size: var(--sqlport-fs-mono-small);
  line-height: 1.4;
  color: var(--sqlport-text-primary);
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
.sql :deep(.kw) { color: var(--sqlport-accent); font-weight: 600; }
.rows { flex: 0 0 auto; font-size: var(--sqlport-fs-mini); color: var(--sqlport-text-secondary); padding-top: 4px; }
</style>
