import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"

/** @type {import('vue-router').RouteRecordRaw[]} */
const routes = [
  // ── Auth routes (public / guest-only) ────────────────────────────────
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/auth/LoginView.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/signup",
    name: "Signup",
    component: () => import("@/views/auth/SignupView.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/verify-email",
    name: "VerifyEmail",
    component: () => import("@/views/auth/VerifyEmailView.vue"),
    meta: { requiresGuest: false },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/views/auth/ForgotPasswordView.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: () => import("@/views/auth/ResetPasswordView.vue"),
    meta: { requiresGuest: true },
  },

  // ── Default redirect ─────────────────────────────────────────────────
  {
    path: "/",
    redirect: "/workspaces",
  },

  // ── User invitations ────────────────────────────────────────────────
  {
    path: "/invitations",
    name: "MyInvitations",
    component: () => import("@/views/invitations/MyInvitationsView.vue"),
    meta: { requiresAuth: true, skipWorkspaceGuard: true },
  },

  // ── Workspace routes ──────────────────────────────────────────────────
  {
    path: "/workspaces",
    name: "WorkspacesList",
    component: () => import("@/views/workspaces/WorkspacesListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspaces/:workspaceId/settings",
    component: () => import("@/views/settings/WorkspaceSettingsView.vue"),
    redirect: { name: "SettingsGeneral" },
    meta: { requiresAuth: true },
    children: [
      {
        path: "general",
        name: "SettingsGeneral",
        component: () => import("@/views/settings/SettingsGeneral.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "members",
        name: "SettingsMembers",
        component: () => import("@/views/settings/SettingsMembers.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "roles",
        name: "SettingsRoles",
        component: () => import("@/views/settings/SettingsRoles.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "profile",
        name: "SettingsProfile",
        component: () => import("@/views/settings/SettingsProfile.vue"),
        meta: { requiresAuth: true },
      },
      {
        path: "account",
        name: "SettingsAccount",
        component: () => import("@/views/settings/SettingsAccount.vue"),
        meta: { requiresAuth: true },
      },
    ],
  },
  {
    path: "/workspaces/:workspaceId/datasets",
    name: "DatasetsList",
    component: () => import("@/views/datasets/DatasetsListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspaces/:workspaceId/datasets/:datasetId",
    name: "DatasetDetail",
    component: () => import("@/views/datasets/DatasetDetailView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspaces/:workspaceId/agents",
    name: "AgentsList",
    component: () => import("@/views/agents/AgentsListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspaces/:workspaceId/conversations",
    name: "ConversationsList",
    component: () => import("@/views/conversations/ConversationsListView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/workspaces/:workspaceId/conversations/:conversationId",
    name: "Chat",
    component: () => import("@/views/conversations/ChatView.vue"),
    meta: { requiresAuth: true },
  },

  // ── Onboarding ──────────────────────────────────────────────────────
  {
    path: "/onboarding",
    name: "Onboarding",
    component: () => import("@/views/onboarding/OnboardingView.vue"),
    meta: { requiresAuth: true, skipWorkspaceGuard: true },
  },

  // ── Catch-all ───────────────────────────────────────────────────────
  {
    path: "/:pathMatch(.*)*",
    redirect: "/workspaces",
  },
]

let workspacesFetched = false

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (!authStore.user) {
    await authStore.initAuth()
  }

  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    workspacesFetched = false
    next({ path: "/login", query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    next({ path: "/workspaces" })
    return
  }

  // Workspace-existence guard (authenticated users on requiresAuth routes only)
  if (isAuthenticated && to.meta.requiresAuth) {
    const workspacesStore = useWorkspacesStore()
    if (!workspacesFetched) {
      await workspacesStore.fetchWorkspaces()
      workspacesFetched = true
    }
    const hasWorkspaces = workspacesStore.workspaces.length > 0

    if (to.name === "Onboarding" && hasWorkspaces) {
      next({ path: "/workspaces" })
      return
    }

    if (!hasWorkspaces && !to.meta.skipWorkspaceGuard) {
      next({ path: "/onboarding" })
      return
    }
  }

  next()
})

export default router
