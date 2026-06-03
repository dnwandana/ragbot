<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { File, History } from "lucide-vue-next"

const stage = ref(0) // 0 idle, 1 searching, 2 answered
let timers = []

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}
function run() {
  clearTimers()
  stage.value = 1
  timers.push(setTimeout(() => (stage.value = 2), 1500))
}
onMounted(() => {
  timers.push(setTimeout(run, 600))
})
onBeforeUnmount(clearTimers)
</script>

<template>
  <MockFrame
    label="ragbot — chat"
    caption="A real answer cites the exact passages it came from. Hover a number to preview the source."
  >
    <div class="chat">
      <div class="bubble bubble--user">What was our refund policy window in the 2024 handbook?</div>
      <div class="bubble bubble--agent">
        <div class="agent-name">Support agent · gpt-4 class</div>
        <div class="agent-row">
          <div class="agent-ava">R</div>
          <div style="flex: 1">
            <div v-if="stage < 2" class="streaming">
              <span class="dots"><i /><i /><i /></span>
              Searching 3 sources…
            </div>
            <div v-else class="fade-key">
              <div class="agent-msg">
                Customers can request a refund within <strong>30 days</strong> of purchase<span
                  class="cite"
                  title="Opens the source at this passage"
                  >1</span
                >. Items must be unused and in original packaging<span
                  class="cite"
                  title="Opens the source at this passage"
                  >2</span
                >. Refunds are processed back to the original payment method within 5–7 business
                days<span class="cite" title="Opens the source at this passage">1</span>.
              </div>
              <div class="sources-row">
                <span class="pill"
                  ><span class="num">1</span><File :size="12" />employee-handbook-2024.pdf<span
                    class="page"
                    >· p.42</span
                  ></span
                >
                <span class="pill"
                  ><span class="num">2</span><File :size="12" />returns-policy.docx<span
                    class="page"
                    >· §3</span
                  ></span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div style="display: flex; justify-content: center; margin-top: 16px">
      <button class="pill" style="cursor: pointer" @click="run">
        <History :size="13" /> Replay
      </button>
    </div>
  </MockFrame>
</template>
