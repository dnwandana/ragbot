<template>
  <div class="auth-container">
    <a-card title="Sign In" style="width: 400px; margin: 80px auto">
      <a-alert
        v-if="$route.query.registered"
        type="success"
        message="Account created! Please check your email to verify your account."
        style="margin-bottom: 16px"
      />
      <a-alert v-if="error" type="error" :message="error" style="margin-bottom: 16px" />
      <a-form @finish="handleSignin" layout="vertical">
        <a-form-item label="Email" name="email" :rules="emailRules">
          <a-input v-model:value="formState.email" type="email" placeholder="you@company.com" />
        </a-form-item>
        <a-form-item label="Password" name="password" :rules="passwordRules">
          <a-input-password v-model:value="formState.password" placeholder="Enter your password" />
        </a-form-item>
        <div style="text-align: right; margin-bottom: 16px">
          <router-link to="/forgot-password" style="font-size: 13px">Forgot password?</router-link>
        </div>
        <a-button type="primary" html-type="submit" :loading="loading" block>Sign In</a-button>
      </a-form>
      <div style="text-align: center; margin-top: 16px">
        Don't have an account? <router-link to="/signup">Sign up</router-link>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { useAuth } from "../../composables/useAuth.js"

const { formState, error, loading, emailRules, passwordRules, handleSignin } = useAuth()
</script>
