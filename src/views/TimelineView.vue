<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../api";
import type { TimelineItem } from "../types";
import PageHeading from "../components/PageHeading.vue";
import AppIcon from "../components/AppIcon.vue";
const records = ref<TimelineItem[]>([]),
  loading = ref(true),
  error = ref(""),
  year = ref("全部");
const years = computed(() =>
  [...new Set(records.value.map((item) => item.time.slice(0, 4)))]
    .sort()
    .reverse(),
);
const groups = computed(() =>
  years.value
    .filter((y) => year.value === "全部" || year.value === y)
    .map((y) => ({
      year: y,
      items: records.value.filter((item) => item.time.startsWith(y)),
    })),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    records.value = await api.getTimeline();
  } catch {
    error.value = "植物变迁记录暂时没有加载成功。";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section>
    <PageHeading
      eyebrow="THE CHANGING LANDSCAPE / 草木年记"
      title="校园的绿意，也在生长变化"
      description="记下新栽的树、熟悉的花，以及那些悄然改变的校园角落。"
    />
    <div class="timeline-layout">
      <aside class="timeline-aside">
        <AppIcon name="clock" :size="35" />
        <h2>草木有时</h2>
        <p>一次调绘，一段记录。<br />把校园的变化留在这里。</p>
        <div class="year-filter" role="group" aria-label="按年份查看">
          <button
            v-for="y in ['全部', ...years]"
            :key="y"
            :aria-pressed="year === y"
            :class="{ selected: year === y }"
            @click="year = y"
          >
            {{ y === "全部" ? "全部年份" : y + " 年"
            }}<AppIcon name="arrow" :size="15" />
          </button>
        </div>
        <small>日期为调查记录时间。</small>
      </aside>
      <div class="timeline-records">
        <div
          v-if="loading"
          class="skeleton"
          role="status"
          aria-label="正在加载变迁记录"
        ></div>
        <div v-else-if="error" class="error-state" role="alert">
          {{ error }}<button @click="load">重新加载</button>
        </div>
        <div v-else-if="!records.length" class="empty-state section-panel">
          <h2>等待下一次草木记录</h2>
          <p>新的观察会在这里留下足迹。</p>
        </div>
        <section
          v-for="group in groups"
          :key="group.year"
          class="year-group"
          v-reveal
        >
          <div class="year-heading">
            <strong>{{ group.year }}</strong
            ><span>{{ group.items.length }} 条记录</span>
          </div>
          <ol>
            <li v-for="item in group.items" :key="item.time + item.content">
              <span class="timeline-dot"></span>
              <div class="record-date">
                {{
                  item.time.length > 4
                    ? item.time.slice(5).replace(".", " / ")
                    : "年度记录"
                }}
              </div>
              <p>{{ item.content }}</p>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </section>
</template>
<style scoped>
.timeline-layout {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 70px;
  margin-top: 44px;
}
.timeline-aside {
  position: sticky;
  top: 120px;
  align-self: start;
  padding: 32px;
  background: #e7eee8;
  border-radius: 8px;
}
.timeline-aside > svg {
  color: #8c6aa1;
  margin-bottom: 22px;
}
.timeline-aside h2 {
  font-size: 28px;
  margin-bottom: 14px;
}
.timeline-aside p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.9;
}
.year-filter {
  display: grid;
  gap: 8px;
  margin: 28px 0;
}
.year-filter button {
  background: transparent;
  border-color: #d3bfdf;
  justify-content: space-between;
  font-size: 12px;
}
.year-filter .selected {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.timeline-aside small {
  color: var(--muted);
  font-size: 10px;
}
.year-heading {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin-bottom: 22px;
}
.year-heading strong {
  font:
    44px Georgia,
    serif;
}
.year-heading span {
  font-size: 11px;
  color: var(--muted);
}
.year-group {
  margin-bottom: 32px;
}
.year-group ol {
  list-style: none;
  padding: 0 0 0 28px;
  margin: 0 0 0 8px;
  border-left: 2px solid #d7ccdf;
}
.year-group li {
  position: relative;
  padding: 2px 0 25px 0;
}
.timeline-dot {
  position: absolute;
  width: 9px;
  height: 9px;
  border: 2px solid #b87596;
  background: var(--paper);
  border-radius: 50%;
  left: -33px;
  top: 7px;
}
.record-date {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin-bottom: 10px;
}
.year-group li p {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 20px 24px;
  margin: 0;
  font-size: 14px;
}
@media (max-width: 900px) {
  .timeline-layout {
    grid-template-columns: 230px minmax(0, 1fr);
    gap: 32px;
  }
  .timeline-aside {
    padding: 24px;
  }
}
@media (max-width: 650px) {
  .timeline-layout {
    display: block;
    margin-top: 26px;
  }
  .timeline-aside {
    position: static;
    padding: 22px;
    margin-bottom: 30px;
  }
  .timeline-aside > svg,
  .timeline-aside > p {
    display: none;
  }
  .timeline-aside h2 {
    font-size: 23px;
  }
  .year-filter {
    display: flex;
    margin: 18px 0;
    gap: 6px;
    flex-wrap: wrap;
  }
  .year-filter button {
    padding: 8px 11px;
  }
  .year-filter button svg {
    display: none;
  }
  .year-heading strong {
    font-size: 36px;
  }
  .year-group li p {
    padding: 18px;
  }
  .year-group ol {
    padding-left: 23px;
  }
  .timeline-dot {
    left: -28px;
  }
}
</style>
