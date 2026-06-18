<script setup>
import { computed } from "vue"

const props = defineProps({
  variant: { type: String, default: "login" },
})

// Verbatim label/cap strings preserved from original component
const copy = {
  login: {
    label: "ragbot — sign in",
    cap: "The sign-in screen — email and password. 'Create an account' and 'Forgot password?' are one click away.",
    eyebrow: "Welcome back",
    title: "Sign in to RAGBot",
    lede: "Pick up the conversation where you left it — your sources and threads are right where you left them.",
    fields: [
      { id: "ac-email", l: "Email", type: "email", ph: "you@work.com", pw: false },
      { id: "ac-pw", l: "Password", type: "password", ph: "••••••••", pw: true },
    ],
    cta: "Sign in",
    foot: { text: "New to RAGBot?", link: "Create an account" },
    forgotLink: true,
  },
  signup: {
    label: "ragbot — create account",
    cap: "Create an account with your name, email, and a password you enter twice.",
    eyebrow: "Create account",
    title: "Start with your sources",
    lede: "A working library, an agent that reads it, citations every step. No setup beyond signing in.",
    fields: [
      { id: "ac-name", l: "Full name", type: "text", ph: "Ada Lovelace", pw: false },
      { id: "ac-email2", l: "Work email", type: "email", ph: "you@work.com", pw: false },
      {
        id: "ac-pw2",
        l: "Password",
        type: "password",
        ph: "••••••••",
        pw: true,
        strengthAfter: true,
      },
      { id: "ac-cpw", l: "Confirm password", type: "password", ph: "••••••••", pw: true },
    ],
    cta: "Create account",
    foot: { text: "Already have an account?", link: "Sign in" },
    forgotLink: false,
  },
  forgot: {
    label: "ragbot — reset password",
    cap: "Enter your email and RAGBot sends a reset link, with a shortcut back to sign in.",
    eyebrow: "Reset password",
    title: "Forgot your password?",
    lede: "Enter the email you signed up with and we'll send a link to choose a new password.",
    fields: [{ id: "ac-email3", l: "Email", type: "email", ph: "you@work.com", pw: false }],
    cta: "Send reset link",
    foot: { text: null, link: "← Back to sign in" },
    forgotLink: false,
  },
}

const c = computed(() => copy[props.variant] || copy.login)
</script>

<template>
  <MockFrame
    :label="c.label"
    :caption="c.cap"
  >
    <div class="ac-shell">
      <div class="ac-card">
        <!-- Header -->
        <div class="ac-eyebrow">
          {{ c.eyebrow }}
        </div>
        <h2 class="ac-title">
          {{ c.title }}
        </h2>
        <p class="ac-lede">
          {{ c.lede }}
        </p>

        <!-- Form fields -->
        <div class="ac-form">
          <template
            v-for="f in c.fields"
            :key="f.id"
          >
            <div class="ac-item">
              <div class="ac-label-row">
                <label
                  :for="f.id"
                  class="ac-label"
                >{{ f.l }}</label>
                <span
                  v-if="f.pw && c.forgotLink"
                  class="ac-forgot"
                >Forgot password?</span>
              </div>
              <div
                class="ac-input-wrap"
                :class="{ 'ac-input-wrap--pw': f.pw }"
              >
                <input
                  :id="f.id"
                  :type="f.type"
                  :placeholder="f.ph"
                  class="ac-input"
                  tabindex="-1"
                  readonly
                >
                <span
                  v-if="f.pw"
                  class="ac-eye"
                >
                  <!-- eye icon approximation — two overlapping circles -->
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                    />
                  </svg>
                </span>
              </div>
            </div>
            <!-- Strength meter stub — rendered immediately after the Password field (signup only) -->
            <template v-if="variant === 'signup' && f.strengthAfter">
              <div class="ac-strength">
                <div class="ac-strength__bar">
                  <div class="ac-strength__fill ac-strength__fill--med" />
                </div>
                <span class="ac-strength__label">Fair</span>
              </div>
            </template>
          </template>

          <!-- Primary button -->
          <button
            class="ac-btn-primary"
            tabindex="-1"
          >
            {{ c.cta }}
          </button>
        </div>

        <!-- Footer strip -->
        <div class="ac-foot">
          <span v-if="c.foot.text">{{ c.foot.text }} </span>
          <span class="ac-foot__link">{{ c.foot.link }}</span>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Shell: centered page wrapper ─────────────────── */
.ac-shell {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

/* ── Card ─────────────────────────────────────────── */
.ac-card {
  width: 100%;
  max-width: 340px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 28px 28px 0;
}

/* ── Header block ────────────────────────────────── */
.ac-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
  text-align: center;
  margin-bottom: 6px;
}

.ac-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.018em;
  line-height: 1.15;
  color: var(--ink);
  margin: 0 0 8px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 9px;
  text-wrap: balance;
  /* No default <h2> margin override needed in mock context */
}

/* bracket decoration matching real auth-title::before/::after */
.ac-title::before {
  content: "[";
  color: var(--brand);
  font-weight: 700;
}

.ac-title::after {
  content: "]";
  color: var(--brand);
  font-weight: 700;
}

.ac-lede {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 20px;
  text-wrap: pretty;
}

/* ── Form ─────────────────────────────────────────── */
.ac-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 0;
}

/* ── Form item ───────────────────────────────────── */
.ac-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ac-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
}

.ac-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  line-height: 1;
}

.ac-forgot {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--brand-3);
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
}

.dark .ac-forgot {
  color: var(--brand);
}

/* ── Input ───────────────────────────────────────── */
.ac-input-wrap {
  position: relative;
}

.ac-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  color: var(--ink);
  font-size: 13.5px;
  font-family: var(--font-sans);
  padding: 9px 11px;
  outline: none;
  cursor: default;
  pointer-events: none;
  /* Make password dots render the same as real app */
}

.ac-input-wrap--pw .ac-input {
  padding-right: 36px;
}

.ac-input::placeholder {
  color: var(--ink-4);
}

/* Simulate the password dots with letter-spacing trick for type=password */
input[type="password"].ac-input::placeholder {
  letter-spacing: 0.2em;
}

/* eye icon button */
.ac-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-4);
  display: flex;
  align-items: center;
  pointer-events: none;
}

/* ── Strength meter (signup) ─────────────────────── */
.ac-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: -4px;
}

.ac-strength__bar {
  flex: 1;
  height: 3px;
  background: var(--line);
  border-radius: 2px;
  overflow: hidden;
}

.ac-strength__fill {
  height: 100%;
  border-radius: 2px;
}

.ac-strength__fill--med {
  width: 50%;
  background: var(--warn);
}

.ac-strength__label {
  font-size: 10.5px;
  color: var(--warn);
  font-weight: 500;
  min-width: 28px;
}

/* ── Primary button ──────────────────────────────── */
.ac-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r);
  font: 600 13.5px var(--font-sans);
  letter-spacing: -0.003em;
  cursor: default;
  pointer-events: none;
  margin-top: 2px;
}

/* ── Footer strip ────────────────────────────────── */
.ac-foot {
  font-size: 12.5px;
  color: var(--ink-3);
  text-align: center;
  padding: 13px 28px;
  margin: 14px -28px 0;
  border-top: 1px solid var(--line);
}

.ac-foot__link {
  color: var(--brand-3);
  font-weight: 500;
  cursor: pointer;
}

.dark .ac-foot__link {
  color: var(--brand);
}
</style>
