<template>
  <div class="auth-container">
    <a-card title="Verify Email" style="width: 400px; margin: 80px auto">
      <a-spin v-if="loading" tip="Verifying..." />
      <a-result
        v-else-if="success"
        status="success"
        title="Email Verified"
        sub-title="You can now sign in."
      >
        <template #extra>
          <a-button type="primary" @click="$router.push('/login')">Sign In</a-button>
        </template>
      </a-result>
      <a-result v-else status="error" title="Verification Failed" :sub-title="error">
        <template #extra>
          <a-button @click="$router.push('/login')">Back to Sign In</a-button>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { verifyEmail } from "../../api/auth.js"

const route = useRoute()
const loading = ref(true)
const success = ref(false)
const error = ref("")

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    error.value = "No verification token provided."
    loading.value = false
    return
  }
  try {
    await verifyEmail(token)
    success.value = true
  } catch (e) {
    error.value = e?.response?.data?.message || "Verification failed. The link may have expired."
  } finally {
    loading.value = false
  }
})
</script>
