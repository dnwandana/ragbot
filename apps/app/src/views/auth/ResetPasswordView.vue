<template>
  <div class="auth-container">
    <a-card title="Reset Password" style="width: 400px; margin: 80px auto">
      <a-result v-if="success" status="success" title="Password Reset">
        <template #extra>
          <a-button type="primary" @click="$router.push('/login')">Sign In</a-button>
        </template>
      </a-result>
      <a-alert
        v-else-if="pageError"
        type="error"
        :message="pageError"
        style="margin-bottom: 16px"
      />
      <a-form v-else ref="formRef" :model="form" @finish="handleSubmit" layout="vertical">
        <a-form-item
          label="New Password"
          name="password"
          :rules="[{ required: true, min: 8, message: 'Min 8 characters' }]"
        >
          <a-input-password v-model:value="form.password" />
        </a-form-item>
        <a-form-item
          label="Confirm Password"
          name="confirmation_password"
          :rules="[{ required: true, message: 'Required' }]"
        >
          <a-input-password v-model:value="form.confirmation_password" />
        </a-form-item>
        <a-alert v-if="error" type="error" :message="error" style="margin-bottom: 8px" />
        <a-button type="primary" html-type="submit" :loading="loading" block
          >Reset Password</a-button
        >
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue"
import { useRoute } from "vue-router"
import { resetPassword } from "../../api/auth.js"

const route = useRoute()
const form = reactive({ password: "", confirmation_password: "" })
const loading = ref(false)
const success = ref(false)
const error = ref("")
const pageError = ref("")

onMounted(() => {
  if (!route.query.token)
    pageError.value = "No reset token found. Request a new password reset link."
})

async function handleSubmit() {
  if (form.password !== form.confirmation_password) {
    error.value = "Passwords do not match"
    return
  }
  loading.value = true
  error.value = ""
  try {
    await resetPassword({
      token: route.query.token,
      password: form.password,
      confirmation_password: form.confirmation_password,
    })
    success.value = true
  } catch (e) {
    error.value = e?.response?.data?.message || "Reset failed. The link may have expired."
  } finally {
    loading.value = false
  }
}
</script>
