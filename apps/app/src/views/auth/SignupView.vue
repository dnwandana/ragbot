<script setup>
import AuthShell from "@/components/AuthShell.vue"
import StrengthMeter from "@/components/StrengthMeter.vue"
import { useAuth } from "@/composables/useAuth"

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

<template>
  <AuthShell>
    <div class="auth-card">
      <div class="auth-eyebrow">Create account</div>
      <h1 class="auth-title">Start with your sources</h1>
      <p class="auth-lede">
        A working library, an agent that reads it, citations every step. No setup beyond signing in.
      </p>

      <a-form :model="formState" layout="vertical" @finish="handleSignup">
        <a-form-item name="full_name" label="Full name" :rules="fullNameRules">
          <a-input
            v-model:value="formState.full_name"
            placeholder="Ada Lovelace"
            autocomplete="name"
          />
        </a-form-item>

        <a-form-item name="email" label="Work email" :rules="emailRules">
          <a-input
            v-model:value="formState.email"
            type="email"
            placeholder="you@work.com"
            autocomplete="email"
          />
        </a-form-item>

        <a-form-item name="password" label="Password" :rules="passwordRules">
          <a-input-password
            v-model:value="formState.password"
            placeholder="At least 8 characters"
            autocomplete="new-password"
          />
        </a-form-item>

        <StrengthMeter :password="formState.password" />

        <a-form-item name="confirmation_password" label="Confirm password" :rules="confirmRules">
          <a-input-password
            v-model:value="formState.confirmation_password"
            placeholder="Repeat your password"
            autocomplete="new-password"
          />
        </a-form-item>

        <div v-if="error" class="form-alert form-alert--err">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading" style="margin-top: 4px">
          {{ loading ? "Creating account…" : "Create account" }}
        </button>
      </a-form>

      <div class="auth-foot">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </div>
    </div>
  </AuthShell>
</template>
