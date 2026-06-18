<script setup>
import { ChevronDown } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — new agent"
    caption="An agent's settings: name, system prompt, model, and temperature — editable any time."
  >
    <div class="drawer">
      <!-- Header -->
      <div class="drawer-head">
        <div class="head-info">
          <div class="drawer-title">New agent</div>
          <div class="drawer-sub">Create agent</div>
        </div>
        <button class="close-btn" aria-label="Close">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="drawer-body">
        <form class="form">
          <!-- Name -->
          <div class="form-item">
            <label class="form-label">Name</label>
            <div class="form-control">
              <input class="input" type="text" value="Support agent" readonly />
            </div>
          </div>

          <!-- Description -->
          <div class="form-item">
            <label class="form-label">Description</label>
            <div class="form-control">
              <input class="input" type="text" placeholder="Optional description" readonly />
            </div>
          </div>

          <div class="section-divider" />

          <!-- System prompt -->
          <div class="form-item">
            <label class="form-label">System prompt</label>
            <div class="form-control">
              <textarea class="textarea" rows="5" readonly>
You are a friendly support assistant. Answer only from the connected handbook and policy documents. If something isn't covered, say so and suggest who to contact.</textarea
              >
            </div>
          </div>

          <div class="section-divider" />

          <!-- Model -->
          <div class="form-item">
            <label class="form-label">Model</label>
            <div class="form-control">
              <!-- Fake select trigger (closed) -->
              <div class="select-box">
                <span class="model-opt-label">GPT-5.4 Mini</span>
                <span class="model-badge">Balanced</span>
                <ChevronDown class="select-arrow" :size="14" />
              </div>
            </div>
            <!-- Guide link -->
            <button type="button" class="guide-link">Not sure which to pick? Help me choose</button>
            <!-- Guide panel — shown open with a selection -->
            <div class="guide-panel">
              <div class="guide-question">What will you mostly use it for?</div>
              <div class="guide-chips">
                <button type="button" class="guide-chip guide-chip--on">Everyday questions</button>
                <button type="button" class="guide-chip">Difficult questions</button>
                <button type="button" class="guide-chip">Lots of questions, low cost</button>
              </div>
              <!-- Recommendation card -->
              <div class="guide-reco">
                <div class="guide-reco-info">
                  <div class="guide-reco-top">
                    <span class="guide-reco-label">GPT-5.4 Mini</span>
                    <span class="model-badge model-badge--rec">Our pick</span>
                  </div>
                  <div class="guide-reco-reason">Great answers at a lower cost</div>
                </div>
                <button type="button" class="guide-use-btn">Use this</button>
              </div>
            </div>
          </div>

          <!-- Temperature -->
          <div class="form-item">
            <label class="form-label">Temperature</label>
            <div class="form-control">
              <div class="slider-wrap">
                <div class="slider-track">
                  <div class="slider-fill" style="width: 35%" />
                  <div class="slider-thumb" style="left: 35%" />
                </div>
                <div class="slider-marks">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky footer -->
          <div class="drawer-foot">
            <button type="submit" class="btn-save">Save agent</button>
            <button type="button" class="btn-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Drawer shell (no fixed positioning — mocks are component-only) ── */
.drawer {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  min-height: 580px;
}

/* ── Header ── */
.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.head-info {
  flex: 1;
  min-width: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.015em;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-sub {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.close-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-2);
  background: var(--surface);
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-3);
  cursor: default;
}

/* ── Body ── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Form item (mirrors a-form-item layout="vertical") ── */
.form-item {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.form-control {
  display: flex;
  flex-direction: column;
}

/* ── Input (mirrors a-input) ── */
.input {
  width: 100%;
  height: 32px;
  padding: 4px 11px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font: 400 13px var(--font-sans);
  color: var(--ink);
  outline: none;
  box-sizing: border-box;
}

.input::placeholder {
  color: var(--ink-4);
}

/* ── Textarea (mirrors a-textarea :rows="8") ── */
.textarea {
  width: 100%;
  padding: 6px 11px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font: 400 13px var(--font-sans);
  color: var(--ink);
  outline: none;
  resize: none;
  line-height: 1.55;
  box-sizing: border-box;
}

/* ── Section divider ── */
.section-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 4px 0 16px;
}

/* ── Model select (mirrors a-select closed state) ── */
.select-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 11px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  cursor: default;
}

.select-arrow {
  margin-left: auto;
  color: var(--ink-4);
  flex-shrink: 0;
}

.model-opt-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  flex: 1;
  min-width: 0;
}

.model-badge {
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 600;
  background: var(--bg-2);
  color: var(--ink-3);
  border: 1px solid var(--line);
  flex-shrink: 0;
  white-space: nowrap;
}

.model-badge--rec {
  background: var(--brand-tint);
  color: var(--brand-3);
  border-color: rgba(255, 107, 53, 0.25);
}

/* ── Guide link ── */
.guide-link {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--brand);
  cursor: default;
  text-align: left;
}

/* ── Guide panel ── */
.guide-panel {
  margin-top: 8px;
  padding: 12px;
  background: var(--brand-tint);
  border: 1px solid var(--brand);
  border-radius: var(--r);
}

.guide-question {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}

.guide-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.guide-chip {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--line-2);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: default;
}

.guide-chip--on {
  border-color: var(--brand);
  color: var(--brand);
}

.guide-reco {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--brand);
  border-radius: var(--r-sm);
}

.guide-reco-info {
  flex: 1;
  min-width: 0;
}

.guide-reco-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.guide-reco-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.guide-reco-reason {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.guide-use-btn {
  padding: 6px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: default;
  flex-shrink: 0;
}

/* ── Temperature slider (mirrors a-slider, thumb at 35% = 0.7 of 0–2) ── */
.slider-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0 2px;
}

.slider-track {
  position: relative;
  height: 4px;
  background: var(--line-2);
  border-radius: 2px;
  margin: 0 8px;
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: var(--brand);
  border-radius: 2px;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--brand);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ink-4);
  padding: 0 8px;
}

/* ── Footer ── */
.drawer-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 14px 0 20px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

.btn-save {
  flex: 1;
  padding: 10px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: default;
}

.btn-cancel {
  padding: 10px 16px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 13px;
  cursor: default;
}

/* ── Dark mode overrides ── */
.dark .input,
.dark .textarea,
.dark .select-box {
  background: var(--bg-2);
  border-color: var(--line-2);
  color: var(--ink);
}

.dark .slider-thumb {
  background: var(--surface);
}
</style>
