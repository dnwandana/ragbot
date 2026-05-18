<template>
  <div class="auth-container">
    <a-card title="Create Account" style="width: 400px; margin: 80px auto">
      <a-alert v-if="error" type="error" :message="error" style="margin-bottom: 16px" />
      <a-form @finish="handleSignup" layout="vertical">
        <a-form-item label="Full Name" name="full_name" :rules="fullNameRules">
          <a-input v-model:value="formState.full_name" placeholder="Jane Doe" />
        </a-form-item>
        <a-form-item label="Email" name="email" :rules="emailRules">
          <a-input v-model:value="formState.email" type="email" placeholder="you@company.com" />
        </a-form-item>
        <a-form-item label="Password" name="password" :rules="passwordRules">
          <a-input-password v-model:value="formState.password" placeholder="Min 8 characters" />
        </a-form-item>
        <a-form-item label="Confirm Password" name="confirmation_password" :rules="confirmRules">
          <a-input-password
            v-model:value="formState.confirmation_password"
            placeholder="Re-enter password"
          />
        </a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading" block
          >Create Account</a-button
        >
      </a-form>
      <div style="text-align: center; margin-top: 16px">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { useAuth } from "../../composables/useAuth.js"

const {
  formState,
  error,
  loading,
  emailRules,
  passwordRules,
  confirmRules,
  fullNameRules,
  handleSignup,
} = useAuth()
</script>
