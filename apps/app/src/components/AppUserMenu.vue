<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { User, Lock } from "lucide-vue-next"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const props = defineProps({
  workspaceId: { type: String, default: null },
})

const router = useRouter()
const authStore = useAuthStore()

const currentUser = computed(() => authStore.currentUser)

const avatarInitials = computed(() => {
  const name = currentUser.value?.full_name || ""
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
})

const isOpen = ref(false)
const menuAnchor = ref(null)
const triggerRef = ref(null)
const menuRef = ref(null)

/** Open or close the popup, computing position from the trigger element. */
function toggleMenu() {
  if (isOpen.value) {
    isOpen.value = false
    menuAnchor.value = null
    return
  }
  const rect = triggerRef.value.getBoundingClientRect()
  menuAnchor.value = {
    top: rect.top,
    left: Math.min(rect.left, window.innerWidth - 216),
  }
  isOpen.value = true
}

/** Close the popup on any document click outside the trigger and menu. */
function onDocumentClick(e) {
  if (!triggerRef.value?.contains(e.target) && !menuRef.value?.contains(e.target)) {
    isOpen.value = false
    menuAnchor.value = null
  }
}

/** Close the popup when Escape is pressed. */
function onDocumentKeydown(e) {
  if (e.key === "Escape") {
    isOpen.value = false
    menuAnchor.value = null
  }
}

/** Navigate to a settings route and close the menu. */
function navigateTo(routeName) {
  isOpen.value = false
  router.push({ name: routeName, params: { workspaceId: props.workspaceId } })
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick)
  document.addEventListener("keydown", onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick)
  document.removeEventListener("keydown", onDocumentKeydown)
})
</script>

<template>
  <!-- Trigger: avatar + name + secondary text -->
  <div
    ref="triggerRef"
    class="user-trigger"
    :class="{ 'user-trigger--active': isOpen }"
    role="button"
    tabindex="0"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    @click="toggleMenu"
    @keydown.enter="toggleMenu"
    @keydown.space.prevent="toggleMenu"
  >
    <div class="user-avatar">{{ avatarInitials }}</div>
    <div class="user-info">
      <div class="user-name">{{ currentUser?.full_name || "User" }}</div>
    </div>
  </div>

  <!-- Popup: rendered fixed above the trigger -->
  <Teleport to="body">
    <div
      v-if="isOpen && menuAnchor"
      ref="menuRef"
      class="user-menu"
      role="menu"
      :style="{
        left: menuAnchor.left + 'px',
        top: menuAnchor.top - 6 + 'px',
        transform: 'translateY(-100%)',
      }"
    >
      <!-- Header: name + email (read-only) -->
      <div class="user-menu__header">
        <div class="user-menu__header-name">{{ currentUser?.full_name || "User" }}</div>
        <div class="user-menu__header-email">{{ currentUser?.email || "" }}</div>
      </div>

      <!-- Links: only when a workspace is active -->
      <template v-if="workspaceId">
        <div class="user-menu__divider" />
        <div
          class="user-menu__item"
          role="menuitem"
          tabindex="0"
          @click="navigateTo('SettingsProfile')"
          @keydown.enter.prevent="navigateTo('SettingsProfile')"
          @keydown.space.prevent="navigateTo('SettingsProfile')"
        >
          <User :size="14" :stroke-width="1.7" class="menu-icon" />
          Profile
        </div>
        <div
          class="user-menu__item"
          role="menuitem"
          tabindex="0"
          @click="navigateTo('SettingsAccount')"
          @keydown.enter.prevent="navigateTo('SettingsAccount')"
          @keydown.space.prevent="navigateTo('SettingsAccount')"
        >
          <Lock :size="14" :stroke-width="1.7" class="menu-icon" />
          Security
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Trigger area ── */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: var(--r-sm);
  padding: 2px 4px;
  margin: -2px -4px;
  transition:
    background var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}

.user-trigger:hover {
  background: rgba(24, 18, 12, 0.05);
}

.user-trigger--active {
  background: rgba(24, 18, 12, 0.07);
}

[data-theme="dark"] .user-trigger:hover {
  background: rgba(240, 235, 227, 0.06);
}

[data-theme="dark"] .user-trigger--active {
  background: rgba(240, 235, 227, 0.08);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand-tint);
  color: var(--brand-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--t-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Popup ── */
.user-menu {
  position: fixed;
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-3);
  padding: 6px;
  z-index: 120;
}

.user-menu__header {
  padding: 8px 10px 10px;
}

.user-menu__header-name {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__header-email {
  font-size: var(--t-xs);
  color: var(--ink-4);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__divider {
  height: 1px;
  background: var(--line);
  margin: 0 0 6px;
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  color: var(--ink-2);
  font-size: var(--t-base);
  font-weight: 500;
  transition: background var(--dur) var(--ease);
}

.user-menu__item:hover {
  background: var(--bg-2);
}

.menu-icon {
  flex-shrink: 0;
  color: inherit;
}
</style>
