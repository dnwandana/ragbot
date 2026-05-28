<script setup>
// Shell provides the centered page wrapper only.
// Slot accepts the auth card rendered by each view.
</script>

<template>
  <div class="auth-shell">
    <slot />
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: start center;
  padding: 36px 24px 64px;
  background: var(--bg);
}

@media (max-width: 520px) {
  .auth-shell {
    padding: 20px 16px 48px;
  }
}
</style>

<style>
/*
  Auth card system — non-scoped so slot content in every view
  can use these classes. All AntD overrides are scoped via
  .auth-card to avoid leaking into the rest of the app.
*/

/* ── Card ────────────────────────────────────────── */
.auth-card {
  /* bottom padding is intentionally 0; .auth-foot provides it via negative margin */
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 36px 36px 0;
}

/* ── Header block ────────────────────────────────── */
.auth-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
  text-align: center;
  margin-bottom: 6px;
}

.auth-title {
  font-size: 22px;
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
}

.auth-title::before {
  content: "[";
  color: var(--brand);
  font-weight: 700;
}

.auth-title::after {
  content: "]";
  color: var(--brand);
  font-weight: 700;
}

.auth-lede {
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-3);
  text-align: center;
  margin: 0 0 22px;
  text-wrap: pretty;
}

.auth-lede strong {
  color: var(--ink-2);
  font-weight: 500;
}

/* ── Footer strip ────────────────────────────────── */
.auth-foot {
  font-size: 12.5px;
  color: var(--ink-3);
  text-align: center;
  padding: 14px 36px;
  margin: 16px -36px 0;
  border-top: 1px solid var(--line);
}

.auth-foot a {
  color: var(--brand-3);
  font-weight: 500;
  text-decoration: none;
}

.auth-foot a:hover {
  color: var(--brand-2);
}

.auth-foot a:focus-visible {
  outline: 2px solid var(--brand-3);
  outline-offset: 2px;
  border-radius: 2px;
}

/* ── Primary button ──────────────────────────────── */
.auth-card .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r);
  font: 600 13.5px var(--font-sans);
  letter-spacing: -0.003em;
  cursor: pointer;
  text-decoration: none;
  transition: background var(--dur) var(--ease);
}

.auth-card .btn-primary:hover:not(:disabled) {
  background: var(--brand-2);
}

.auth-card .btn-primary:active:not(:disabled) {
  background: var(--brand-3);
}

.auth-card .btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-card .btn-primary:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg),
    0 0 0 4px var(--brand);
}

/* ── Ghost button ────────────────────────────────── */
.auth-card .btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 16px;
  background: transparent;
  color: var(--ink-2);
  border: none;
  border-radius: var(--r);
  font: 500 13px var(--font-sans);
  cursor: pointer;
  text-decoration: none;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.auth-card .btn-ghost:hover:not(:disabled) {
  background: var(--bg-2);
  color: var(--ink);
}

.auth-card .btn-ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.auth-card .btn-ghost:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--bg),
    0 0 0 4px var(--ink-3);
}

/* ── Stacked action buttons ──────────────────────── */
.auth-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Card bottom spacer (states without .auth-foot) ─ */
.auth-card-spacer {
  height: 24px;
}

/* ── Form-level error banner ─────────────────────── */
.form-alert {
  padding: 9px 11px;
  border-radius: var(--r);
  font-size: 12.5px;
  line-height: 1.45;
  margin-bottom: 14px;
}

.form-alert--err {
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  color: var(--err);
}

/* ── Status icon (verify / reset screens) ────────── */
.status-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.status-icon svg {
  width: 26px;
  height: 26px;
  stroke-width: 1.6;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.status-icon--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
}

.status-icon--err {
  background: var(--err-bg);
  color: var(--err);
  border: 1px solid var(--err-border);
}

.status-icon--brand {
  background: var(--brand-tint);
  color: var(--brand-3);
  border: 1px solid rgba(255, 107, 53, 0.18);
}

/* ── Recipient pill (check-email screen) ─────────── */
.recipient-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--ink-2);
  margin-bottom: 8px;
}

/* ── Cooldown resend row ──────────────────────────── */
.resend-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ink-3);
  margin-bottom: 8px;
}

.resend-btn {
  background: transparent;
  border: none;
  padding: 0;
  font: 500 12.5px var(--font-sans);
  color: var(--brand-3);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.resend-btn:hover:not(:disabled) {
  color: var(--brand-2);
}

.resend-btn:disabled {
  color: var(--ink-4);
  cursor: not-allowed;
  text-decoration: none;
}

.resend-btn:focus-visible {
  outline: 2px solid var(--brand-3);
  outline-offset: 2px;
  border-radius: 2px;
}

.resend-timer {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  padding: 2px 6px;
  background: var(--bg-2);
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
}

/* ── Redirect countdown (reset success) ──────────── */
.redirect-countdown {
  font-size: 12px;
  color: var(--ink-3);
  text-align: center;
  margin-top: 8px;
}

.redirect-countdown span {
  font-family: var(--font-mono);
  color: var(--ink-2);
}

/* ── Ant Design form overrides ───────────────────── */
/* Scoped to .auth-card so they don't leak into the rest of the app */

.auth-card .ant-form-item {
  margin-bottom: 14px;
}

.auth-card .ant-form-item-label > label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  height: auto;
  /* AntD uses inline-flex which shrink-wraps to content width.
     Switch to flex + full width so slot content like .password-label-row
     can use justify-content: space-between across the full label column. */
  display: flex;
  width: 100%;
}

/* Hide the red required asterisk — design doesn't use it */
.auth-card .ant-form-item-label > label.ant-form-item-required::before {
  display: none;
}

.auth-card .ant-input,
.auth-card .ant-input-affix-wrapper {
  background: var(--surface);
  border-color: var(--line-2);
  border-radius: var(--r-sm);
  color: var(--ink);
  font-size: 13.5px;
  padding: 9px 11px;
}

.auth-card .ant-input::placeholder,
.auth-card .ant-input-affix-wrapper input::placeholder {
  color: var(--ink-4);
}

.auth-card .ant-input:hover:not([disabled]),
.auth-card .ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
  border-color: var(--ink-4);
}

.auth-card .ant-input:focus,
.auth-card .ant-input-affix-wrapper-focused {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.18);
}

.auth-card .ant-form-item-has-error .ant-input,
.auth-card .ant-form-item-has-error .ant-input-affix-wrapper {
  border-color: var(--err);
}

.auth-card .ant-form-item-has-error .ant-input:focus,
.auth-card .ant-form-item-has-error .ant-input-affix-wrapper-focused {
  box-shadow: 0 0 0 2px rgba(192, 41, 31, 0.15);
}

.auth-card .ant-form-item-explain-error {
  font-size: 11.5px;
  color: var(--err);
}

/* ── Mobile ──────────────────────────────────────── */
@media (max-width: 520px) {
  .auth-card {
    padding: 28px 22px 0;
  }

  .auth-title {
    font-size: 20px;
  }

  .auth-lede {
    font-size: 13.5px;
  }

  .auth-foot {
    padding: 14px 22px;
    margin: 16px -22px 0;
  }

  .status-icon {
    width: 44px;
    height: 44px;
    border-radius: 11px;
  }

  .status-icon svg {
    width: 22px;
    height: 22px;
  }
}
</style>
