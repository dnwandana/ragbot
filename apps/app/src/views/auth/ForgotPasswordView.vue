<template>
  <div class="auth-container">
    <a-card title="Forgot Password" style="width: 400px; margin: 80px auto">
      <a-result
        v-if="sent"
        status="success"
        title="Reset Link Sent"
        sub-title="If your email is registered, a reset link has been sent. Check your inbox."
      />
      <a-form v-else @finish="handleSubmit" layout="vertical">
        <a-form-item label="Email" name="email" :rules="[{ required: true, type: 'email' }]">
          <a-input v-model:value="email" type="email" placeholder="you@company.com" />
        </a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading" block
          >Send Reset Link</a-button
        >
        <div style="margin-top: 12px; text-align: center">
          <router-link to="/login">Back to Sign In</router-link>
        </div>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { forgotPassword } from "../../api/auth.js"

const email = ref("")
const loading = ref(false)
const sent = ref(false)

async function handleSubmit() {
  loading.value = true
  try {
    await forgotPassword(email.value)
    sent.value = true
  } finally {
    loading.value = false
  }
}
</script>
