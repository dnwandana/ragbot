<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { baseURL } from "@/utils/http"
import ReadonlyThread from "@/components/chat/ReadonlyThread.vue"

const route = useRoute()
const webUrl = import.meta.env.VITE_WEB_URL || "/"

/** "loading" | "ready" | "missing" | "error" */
const state = ref("loading")
const share = ref(null)

/** Fetches the public snapshot. No cookies: the page is anonymous by design. */
async function load() {
  state.value = "loading"
  try {
    const res = await fetch(`${baseURL}/share/${encodeURIComponent(route.params.id)}`, {
      credentials: "omit",
    })
    if (res.status === 404) {
      state.value = "missing"
      return
    }
    if (!res.ok) throw new Error(`Share request failed with status ${res.status}`)
    share.value = (await res.json()).data
    state.value = "ready"
  } catch {
    state.value = "error"
  }
}

const robots = document.createElement("meta")
robots.name = "robots"
robots.content = "noindex"
onMounted(() => {
  document.head.appendChild(robots)
  load()
})
onUnmounted(() => robots.remove())

const snapshot = computed(() => share.value?.snapshot)
const sharedOn = computed(() =>
  new Date(share.value.updated_at).toLocaleDateString(undefined, { dateStyle: "long" }),
)
defineExpose({ state, load })
</script>

<template>
  <div class="share-page">
    <header class="share-page__bar">
      <a :href="webUrl" class="share-page__brand">RAGBot</a>
      <a :href="webUrl" class="share-page__cta">Try RAGBot</a>
    </header>
    <main class="share-page__main">
      <p v-if="state === 'loading'" class="share-page__notice" aria-busy="true">Loading…</p>
      <p v-else-if="state === 'missing'" class="share-page__notice">
        This link is no longer available.
      </p>
      <p v-else-if="state === 'error'" class="share-page__notice">
        Something went wrong.
        <button class="share-page__retry" @click="load">Retry</button>
      </p>
      <template v-else>
        <h1 class="share-page__title">{{ snapshot.title }}</h1>
        <p class="share-page__meta">{{ sharedOn }}</p>
        <ReadonlyThread :snapshot="snapshot" />
        <footer class="share-page__footer">
          This is a read-only snapshot. The owner can revoke this link at any time.
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
}
.share-page__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.share-page__brand {
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
}
.share-page__cta {
  padding: 6px 12px;
  border-radius: var(--r-sm);
  background: var(--brand);
  color: #fff;
  font-size: var(--t-sm);
  text-decoration: none;
}
.share-page__main {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
.share-page__title {
  margin: 0 0 4px;
  font-size: var(--t-xl);
}
.share-page__meta,
.share-page__notice,
.share-page__footer {
  color: var(--ink-3);
  font-size: var(--t-sm);
}
.share-page__meta {
  margin: 0 0 24px;
}
.share-page__footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
</style>
