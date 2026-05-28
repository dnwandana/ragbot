<script setup>
// No props — left panel content is fixed brand copy.
// Use the default slot for the right-panel form content.
</script>

<template>
  <div class="auth-shell">
    <!-- Left panel: warm off-white with brand glow -->
    <div class="auth-side">
      <div class="auth-brand" @click="$router.push('/login')">
        <svg class="brand-logo" viewBox="0 0 140 48" role="img" aria-label="RAGBot">
          <text x="2" y="34" fill="var(--brand)" font-size="28" font-weight="700">[</text>
          <text x="15" y="35" fill="var(--ink)" font-size="28" font-weight="700">R</text>
          <text x="35" y="34" fill="var(--brand)" font-size="28" font-weight="700">]</text>
          <text
            x="53"
            y="33"
            fill="var(--ink)"
            font-size="21"
            font-weight="600"
            letter-spacing="-0.5"
          >
            RAGBot
          </text>
        </svg>
      </div>

      <div class="auth-feature">
        <div class="auth-eyebrow">What's new · v3</div>
        <h2 class="auth-headline">Stop searching.<br />Start asking.</h2>
        <p class="auth-sub">
          RAGBot turns your documents into a chat interface your whole team can actually use.
        </p>

        <div class="auth-quote">
          <p class="quote-text">
            "We replaced 4 internal wikis with RAGbot. Onboarding new hires takes half as long."
          </p>
          <div class="quote-author">
            <div class="quote-avatar">MP</div>
            <div>
              <div class="author-name">Maya Petrov</div>
              <div class="author-role">Head of Operations · Lumen</div>
            </div>
            <div class="stars">★★★★★</div>
          </div>
        </div>
      </div>

      <div class="auth-badges">
        <span>SOC 2 Type II</span><span>·</span> <span>GDPR</span><span>·</span>
        <span>HIPAA-ready</span>
      </div>
    </div>

    <!-- Right panel: white form -->
    <div class="auth-form-wrap">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.auth-side {
  background: var(--bg-2);
  padding: 36px 44px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line);
  position: relative;
  overflow: hidden;
}
.auth-side::after {
  content: "";
  position: absolute;
  width: 400px;
  height: 400px;
  right: -140px;
  top: 30%;
  background: radial-gradient(circle, var(--brand-tint) 0%, transparent 70%);
  pointer-events: none;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 2;
  cursor: pointer;
}
.brand-logo {
  height: 28px;
  display: block;
}

.auth-feature {
  margin-top: auto;
  position: relative;
  z-index: 2;
  padding-top: 40px;
}
.auth-eyebrow {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-bottom: 12px;
}
.auth-headline {
  font-family: var(--font-sans);
  font-size: 30px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.18;
  letter-spacing: -0.018em;
  margin: 0 0 14px;
}
.auth-sub {
  font-size: 14px;
  color: var(--ink-3);
  line-height: 1.55;
  max-width: 34ch;
  margin-bottom: 28px;
}

.auth-quote {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 16px;
  max-width: 340px;
  box-shadow: var(--shadow-1);
}
.quote-text {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 12px;
}
.quote-author {
  display: flex;
  align-items: center;
  gap: 10px;
}
.quote-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.author-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
}
.author-role {
  font-size: 11px;
  color: var(--ink-4);
}
.stars {
  color: var(--brand);
  font-size: 11px;
  margin-left: auto;
  letter-spacing: 1px;
}

.auth-badges {
  display: flex;
  gap: 10px;
  margin-top: 28px;
  position: relative;
  z-index: 2;
  font-size: 11px;
  color: var(--ink-4);
}

.auth-form-wrap {
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

@media (max-width: 767px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-side {
    display: none;
  }
  .auth-form-wrap {
    min-height: 100vh;
    align-items: flex-start;
    padding: 40px 24px;
  }
}
</style>
