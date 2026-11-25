<script setup lang="ts">
// AgentApprovalCard — one statement awaiting approval (§5 gate 4). Shows the
// statement (keyword-highlighted, same pass as AgentSqlBlock) + class/verb
// badges. A "no-where-clause" warning turns the card red with an explicit
// "no WHERE — affects the whole table" notice (§5 gate 5, second-confirm
// semantics). Buttons: approve once / auto-approve same verb (only when
// autoOffered) / reject (inline, optional reason). Once decided the card
// freezes into a status line and the buttons disappear.
import { computed, ref } from 'vue'
import AppIcon from '../shared/AppIcon.vue'
import chevronDownIcon from '../../assets/icons/chevron-down.svg?raw'
import { highlightSql } from './markdown'
import { t } from '../../i18n'
import type { ApprovalEntry } from './types'

const props = defineProps<{ entry: ApprovalEntry }>()
const emit = defineEmits<{
  (e: 'approve', scope: 'once' | 'task-verb'): void
  (e: 'reject', reason: string): void
}>()

const html = computed(() => highlightSql(props.entry.sql))
const danger = computed(() => props.entry.warning === 'no-where-clause')
const pending = computed(() => props.entry.status === 'pending')

// EXPLAIN estimate (§5 gate 4): pretty-print the JSON payload; fall back to the
// raw string when it does not parse. Empty → the region hides.
const explainText = computed(() => {
  const raw = props.entry.explain
  if (!raw || !raw.trim()) return ''
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
})
const explainOpen = ref(false)

const rejecting = ref(false)
const reason = ref('')

function doReject() {
  emit('reject', reason.value.trim())
}

const badge = computed(() => {
  const verb = (props.entry.verb || '').toUpperCase()
  const cls = (props.entry.class || '').toUpperCase()
  return verb || cls
})
</script>

<template>
  <div class="approval-card" :class="{ danger, decided: !pending }">
    <div class="head">
      <span class="badge" :class="{ danger }">{{ badge }}</span>
      <span class="title">{{ $t('agent.approval.title') }}</span>
    </div>

    <pre class="sql mono"><code v-html="html" /></pre>

    <!-- EXPLAIN estimate (collapsible). Hidden when the payload is empty. -->
    <div v-if="explainText" class="explain">
      <button type="button" class="explain-head" @click="explainOpen = !explainOpen">
        <AppIcon :src="chevronDownIcon" :size="11" class="caret" :class="{ open: explainOpen }" />
        {{ $t('agent.approval.explainTitle') }}
      </button>
      <pre v-if="explainOpen" class="explain-body mono">{{ explainText }}</pre>
    </div>

    <div v-if="danger" class="warning">{{ $t('agent.approval.noWhere') }}</div>

    <!-- Pending: action buttons -->
    <template v-if="pending">
      <div v-if="!rejecting" class="actions">
        <button type="button" class="btn primary" :class="{ danger }" @click="emit('approve', 'once')">
          {{ $t('agent.approval.approveOnce') }}
        </button>
        <button
          v-if="entry.autoOffered"
          type="button"
          class="btn"
          @click="emit('approve', 'task-verb')"
        >
          {{ $t('agent.approval.approveVerb', { verb: badge }) }}
        </button>
        <button type="button" class="btn ghost" @click="rejecting = true">
          {{ $t('agent.approval.reject') }}
        </button>
      </div>

      <!-- Inline reject reason (optional). -->
      <div v-else class="reject-box">
        <textarea
          v-model="reason"
          class="reason mono"
          rows="2"
          :placeholder="$t('agent.approval.reasonPlaceholder')"
        />
        <div class="actions">
          <button type="button" class="btn ghost" @click="rejecting = false">{{ $t('common.cancel') }}</button>
          <button type="button" class="btn danger" @click="doReject">{{ $t('agent.approval.confirmReject') }}</button>
        </div>
      </div>
    </template>

    <!-- Decided: frozen status line -->
    <div v-else class="status" :class="entry.status">
      <template v-if="entry.status === 'approved'">
        {{ entry.scope === 'task-verb' ? $t('agent.approval.statusApprovedVerb', { verb: badge }) : $t('agent.approval.statusApproved') }}
      </template>
      <template v-else>
        {{ entry.reason ? $t('agent.approval.statusRejectedReason', { reason: entry.reason }) : $t('agent.approval.statusRejected') }}
      </template>
    </div>
  </div>
</template>

<style scoped>
.approval-card {
  border: 1px solid var(--sqlport-separator);
  border-radius: var(--sqlport-rounded-sm);
  background: var(--sqlport-surface-content);
  margin: 6px 0;
  padding: 8px;
  overflow: hidden;
}
.approval-card.danger {
  border-color: var(--sqlport-error);
  background: color-mix(in srgb, var(--sqlport-error) 6%, transparent);
}
.approval-card.decided { opacity: 0.85; }

.head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.badge {
  flex: 0 0 auto;
  font-size: var(--sqlport-fs-mini);
  font-weight: 600;
  line-height: 1;
  padding: 2px 6px;
  border-radius: var(--sqlport-rounded-sm);
  color: var(--sqlport-accent);
  background: var(--sqlport-accent-soft);
}
.badge.danger { color: var(--sqlport-error); background: color-mix(in srgb, var(--sqlport-error) 14%, transparent); }
.title { font-size: var(--sqlport-fs-small); color: var(--sqlport-text-secondary); }

.sql {
  margin: 0;
  padding: 6px 8px;
  border-radius: var(--sqlport-rounded-xs);
  background: var(--sqlport-surface-chrome);
  overflow-x: auto;
  font-size: var(--sqlport-fs-mono);
  line-height: 1.5;
  color: var(--sqlport-text-primary);
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
.sql :deep(.kw) { color: var(--sqlport-accent); font-weight: 600; }

.explain { margin-top: 6px; }
.explain-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: var(--sqlport-fs-mini);
  color: var(--sqlport-text-secondary);
  cursor: default;
  padding: 0;
}
/* Collapsed points right (>), expanded points down (v). */
.caret { transition: transform 130ms ease-out; opacity: 0.6; transform: rotate(-90deg); }
.caret.open { transform: rotate(0deg); }
.explain-body {
  margin: 4px 0 0;
  padding: 6px 8px;
  border-radius: var(--sqlport-rounded-xs);
  background: var(--sqlport-surface-chrome);
  overflow-x: auto;
  font-size: var(--sqlport-fs-mono-small);
  line-height: 1.5;
  color: var(--sqlport-text-secondary);
  white-space: pre;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.warning {
  margin-top: 6px;
  font-size: var(--sqlport-fs-small);
  color: var(--sqlport-error);
  font-weight: 600;
}

.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.btn {
  border: 1px solid var(--sqlport-control-border);
  background: var(--sqlport-surface-content);
  color: var(--sqlport-text-primary);
  font: inherit;
  font-size: var(--sqlport-fs-small);
  height: 24px;
  padding: 0 10px;
  border-radius: var(--sqlport-rounded-sm);
  cursor: default;
  transition: background 130ms ease-out;
}
.btn:hover { background: var(--sqlport-hover-fill); }
.btn.primary {
  border-color: transparent;
  background: var(--sqlport-accent);
  color: var(--sqlport-text-on-accent);
}
.btn.primary:hover { background: var(--sqlport-accent-pressed); }
.btn.primary.danger { background: var(--sqlport-error); }
.btn.danger {
  border-color: transparent;
  background: var(--sqlport-error);
  color: var(--sqlport-text-on-accent);
}
.btn.ghost { border-color: transparent; background: transparent; color: var(--sqlport-text-secondary); }
.btn.ghost:hover { background: var(--sqlport-hover-fill); color: var(--sqlport-text-primary); }

.reject-box { margin-top: 8px; }
.reason {
  width: 100%;
  resize: none;
  border: 1px solid var(--sqlport-control-border);
  border-radius: var(--sqlport-rounded-sm);
  background: var(--sqlport-surface-content);
  color: var(--sqlport-text-primary);
  font-family: inherit;
  font-size: var(--sqlport-fs-small);
  line-height: 1.4;
  padding: 5px 7px;
  outline: none;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
.reason:focus { border-color: var(--sqlport-accent); }

.status {
  margin-top: 6px;
  font-size: var(--sqlport-fs-small);
  color: var(--sqlport-text-secondary);
}
.status.rejected { color: var(--sqlport-error); }
</style>
