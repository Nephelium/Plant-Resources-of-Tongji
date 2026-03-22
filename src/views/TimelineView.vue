<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";
import type { TimelineItem } from "../types";

const records = ref<TimelineItem[]>([]);

onMounted(async () => {
  records.value = await api.getTimeline();
});
</script>

<template>
  <section class="section-panel timeline-panel">
    <div class="timeline-head">
      <h2>植物变迁</h2>
      <RouterLink to="/admin" class="upload-btn">上传点位</RouterLink>
    </div>
    <table>
      <thead>
        <tr>
          <th>时 间</th>
          <th>内 容</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in records" :key="`${item.time}-${item.content}`">
          <td>{{ item.time }}</td>
          <td>{{ item.content }}</td>
        </tr>
      </tbody>
    </table>
    <p class="tip">此处日期与真实日期之间可能会有一定出入。我们会进行不定期更新。</p>
  </section>
</template>

<style scoped>
.timeline-panel {
  padding: 28px;
  min-height: 600px;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.upload-btn {
  padding: 8px 14px;
  border-radius: 10px;
  color: #fff;
  background: linear-gradient(125deg, #6bb9a8, #8dd1c2);
}

table {
  width: 78%;
  margin: 0 auto;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(38, 83, 73, 0.16);
}

th,
td {
  text-align: center;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(132, 183, 168, 0.3);
}

th {
  background: linear-gradient(125deg, rgba(117, 188, 173, 0.6), rgba(206, 238, 230, 0.6));
  color: #1f5a50;
}

td {
  background-color: rgba(255, 255, 255, 0.62);
}

.tip {
  margin-top: 18px;
  text-align: center;
  color: #285d53;
}
</style>
