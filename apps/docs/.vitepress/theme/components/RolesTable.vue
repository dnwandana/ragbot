<script setup>
import { Check } from "lucide-vue-next"

const caps = [
  { cap: "View datasets, agents & chats", oa: true, m: true, v: true },
  { cap: "Chat with agents", oa: true, m: true, v: true },
  { cap: "Upload documents", oa: true, m: true, v: false },
  { cap: "Create & edit datasets", oa: true, m: true, v: false },
  { cap: "Create & edit agents", oa: true, m: true, v: false },
  { cap: "Delete datasets & agents", oa: true, m: false, v: false },
  { cap: "Invite & manage members", oa: true, m: false, v: false },
  { cap: "Change roles & workspace settings", oa: true, m: false, v: false },
]
</script>

<template>
  <div class="tablewrap">
    <table class="roles">
      <thead>
        <tr>
          <th>Capability</th>
          <th><span class="role-h">Owner / Admin</span></th>
          <th><span class="role-h">Editor</span></th>
          <th>
            <span class="role-h">Viewer<small>read-only</small></span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in caps" :key="r.cap">
          <td>{{ r.cap }}</td>
          <td>
            <span v-if="r.oa" class="tick"><Check :size="17" /></span
            ><span v-else class="dash">—</span>
          </td>
          <td>
            <span v-if="r.m" class="tick"><Check :size="17" /></span
            ><span v-else class="dash">—</span>
          </td>
          <td>
            <span v-if="r.v" class="tick"><Check :size="17" /></span
            ><span v-else class="dash">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
