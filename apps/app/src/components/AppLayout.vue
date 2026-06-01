<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useInvitations } from "@/composables/useInvitations"
import AppSidebar from "@/components/AppSidebar.vue"

const authStore = useAuthStore()
const workspacesStore = useWorkspacesStore()
const { fetchMyInvitations } = useInvitations()
const isMobileDrawerOpen = ref(false)

function onResize() {
  if (window.innerWidth >= 768) isMobileDrawerOpen.value = false
}

onMounted(() => {
  window.addEventListener("resize", onResize)
  if (authStore.isAuthenticated) {
    fetchMyInvitations()
    workspacesStore.fetchWorkspaces()
  }
})
onUnmounted(() => window.removeEventListener("resize", onResize))
</script>

<template>
  <div class="app-shell">
    <!-- Sidebar: desktop -->
    <aside class="app-sidebar">
      <AppSidebar />
    </aside>

    <!-- Mobile top bar -->
    <header class="app-topbar">
      <button class="topbar-menu" @click="isMobileDrawerOpen = true" aria-label="Open menu">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path
            d="M1 1h14M1 6h14M1 11h14"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <div class="topbar-brand">
        <svg class="brand-mark" viewBox="4 6 40 36" role="img" aria-label="RAGBot mark">
          <text x="4" y="34" fill="var(--brand)" font-size="28" font-weight="700">[</text>
          <text x="15" y="35" fill="var(--ink)" font-size="28" font-weight="700">R</text>
          <text x="35" y="34" fill="var(--brand)" font-size="28" font-weight="700">]</text>
        </svg>
        RAGBot
      </div>
    </header>

    <!-- Mobile drawer overlay -->
    <Transition name="overlay">
      <div v-if="isMobileDrawerOpen" class="drawer-overlay" @click="isMobileDrawerOpen = false" />
    </Transition>

    <!-- Mobile drawer -->
    <Transition name="drawer">
      <aside v-if="isMobileDrawerOpen" class="app-drawer">
        <AppSidebar @close="isMobileDrawerOpen = false" />
      </aside>
    </Transition>

    <!-- Page content -->
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
  background: var(--bg);
}

.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden; /* TODO: verify all views own their scroll container; was overflow-y: auto */
  background: var(--bg-2);
}

.app-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

/* Mobile top bar */
.app-topbar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--topbar-height);
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  z-index: 40;
  box-shadow: var(--shadow-1);
}
.topbar-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--ink-3);
  border-radius: var(--r-sm);
}
.topbar-menu:hover {
  background: var(--bg-2);
}
.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.brand-mark {
  height: 20px;
  display: block;
}

/* Drawer */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 18, 12, 0.4);
  z-index: 60;
}
.app-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 240px;
  background: var(--bg-2);
  border-right: 1px solid var(--line);
  z-index: 70;
  overflow-y: auto;
  box-shadow: var(--shadow-3);
}

/* Transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s var(--ease);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

@media (max-width: 767px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .app-sidebar {
    display: none;
  }
  .app-topbar {
    display: flex;
  }
  .app-main {
    padding-top: var(--topbar-height);
  }
}
</style>
