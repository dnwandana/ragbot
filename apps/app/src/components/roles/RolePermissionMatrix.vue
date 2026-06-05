<script setup>
/**
 * RolePermissionMatrix — Layout A: permissions grouped by resource as rows with toggles.
 *
 * Props:
 *   - modelValue: string[] of selected permission IDs (v-model)
 *   - permissions: flat array of all permissions from the API
 *   - editable: when false, toggles are disabled (read-only view)
 *
 * Emits:
 *   - update:modelValue — new array of selected permission IDs
 */
import { computed } from "vue"
import { Switch } from "ant-design-vue"
import { groupPermissions } from "@/utils/permissionCatalog"
import { permissionGroupIcon } from "./permissionGroupIcons"

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  permissions: { type: Array, default: () => [] },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(["update:modelValue"])

const groups = computed(() => groupPermissions(props.permissions))

function isOn(id) {
  return props.modelValue.includes(id)
}

function enabledCount(group) {
  return group.permissions.filter((perm) => isOn(perm.id)).length
}

function toggle(id) {
  if (!props.editable) return
  const next = isOn(id)
    ? props.modelValue.filter((permId) => permId !== id)
    : [...props.modelValue, id]
  emit("update:modelValue", next)
}
</script>

<template>
  <div class="matrix">
    <div v-for="group in groups" :key="group.resource" class="group">
      <div class="group-hd">
        <component :is="permissionGroupIcon(group.icon)" :size="16" class="group-icon" />
        <span class="group-label">{{ group.label }}</span>
        <span class="group-count">{{ enabledCount(group) }}/{{ group.permissions.length }}</span>
      </div>
      <div class="rows">
        <label
          v-for="perm in group.permissions"
          :key="perm.id"
          class="row"
          :class="{ 'row--static': !editable }"
        >
          <span class="row-text">
            <span class="row-label">{{ perm.label }}</span>
            <span v-if="perm.destructive" class="badge-destructive">Destructive</span>
          </span>
          <Switch
            :checked="isOn(perm.id)"
            :disabled="!editable"
            size="small"
            @change="toggle(perm.id)"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matrix {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.group-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.group-icon {
  color: var(--ink-3);
}
.group-label {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.group-count {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono, monospace);
}
.rows {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
}
.row:last-child {
  border-bottom: none;
}
.row--static {
  cursor: default;
}
.row-text {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
}
.row-label {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
}
.badge-destructive {
  font-size: 10px;
  font-weight: 600;
  color: var(--err, #c0392b);
  background: var(--err-tint, #fdecea);
  border-radius: 4px;
  padding: 1px 6px;
}
</style>
