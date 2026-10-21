<script setup lang="ts">
import type { PlantInfo } from "../types";
import PlantGallery from "./PlantGallery.vue";
import PlantMap from "./PlantMap.vue";
import AppIcon from "./AppIcon.vue";
import { periodLabel, plantLink } from "../utils/plants";
defineProps<{ plant: PlantInfo; compact?: boolean }>();
</script>
<template>
  <div class="plant-profile" :class="{ compact }">
    <div class="profile-heading">
      <div>
        <div class="eyebrow">BOTANICAL PORTRAIT / 植物档案</div>
        <h1>{{ plant.chinese_name }}</h1>
        <p class="latin-name">{{ plant.scientific_name }}</p>
      </div>
      <RouterLink
        :to="{ path: '/', query: { q: plant.chinese_name } }"
        class="button button-primary"
        ><AppIcon name="pin" :size="16" />在地图上寻找</RouterLink
      >
    </div>
    <div class="profile-body">
      <div class="profile-photo">
        <PlantGallery
          :key="plant.chinese_name"
          :name="plant.chinese_name"
          :src="plant.imageUrl"
          eager
        />
      </div>
      <div class="profile-info">
        <div class="eyebrow">植物小档案</div>
        <dl>
          <div>
            <dt>科</dt>
            <dd>{{ plant.category || "暂无记录" }}</dd>
          </div>
          <div>
            <dt>属</dt>
            <dd>{{ plant.family || "暂无记录" }}</dd>
          </div>
          <div>
            <dt>花期</dt>
            <dd>{{ periodLabel(plant.flower_period) }}</dd>
          </div>
          <div>
            <dt>果期</dt>
            <dd>{{ periodLabel(plant.fruit_period) }}</dd>
          </div>
          <div>
            <dt>调查点位</dt>
            <dd>{{ plant.points?.length ?? 0 }} <small>个</small></dd>
          </div>
        </dl>
        <p v-if="plant.description" class="profile-description">
          {{ plant.description }}
        </p>
        <div class="profile-note">
          <AppIcon name="leaf" :size="18" />
          <p>带着一个名字出发，<br />在校园里与它相遇。</p>
        </div>
      </div>
    </div>
    <section v-if="plant.points?.length" class="profile-distribution">
      <div class="section-heading">
        <h2>在校园的这些地方</h2>
        <span class="badge">{{ plant.points.length }} 个点位</span>
      </div>
      <PlantMap
        :features="plant.points"
        compact
        :label="plant.chinese_name + '的分布地图'"
      />
    </section>
    <section v-if="plant.related?.length" class="profile-related">
      <h3>同科的草木</h3>
      <div>
        <RouterLink
          v-for="item in plant.related"
          :key="item.chinese_name"
          :to="plantLink(item.chinese_name)"
          class="chip button"
          >{{ item.chinese_name }} <AppIcon name="arrow" :size="13"
        /></RouterLink>
      </div>
    </section>
  </div>
</template>
<style scoped>
.profile-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 25px;
}
.profile-heading h1 {
  margin: 12px 0 10px;
  font-size: 42px;
}
.latin-name {
  font:
    italic 20px Georgia,
    serif;
  color: var(--muted);
  margin: 0;
}
.profile-heading .button {
  font-size: 12px;
}
.profile-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(250px, 0.85fr);
  gap: 28px;
}
.profile-photo {
  margin: 0;
}
.profile-info {
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 21px;
  align-self: start;
  background: var(--surface);
}
dl {
  margin: 18px 0;
}
dl > div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
}
dt {
  color: var(--muted);
  font-size: 12px;
}
dd {
  margin: 0;
  text-align: right;
}
.profile-note {
  display: flex;
  align-items: center;
  gap: 15px;
  color: var(--muted);
  margin-top: 25px;
}
.profile-note p {
  font: 14px/1.8 var(--display);
  margin: 0;
}
.profile-description {
  color: var(--muted);
  font-size: 13px;
}
.profile-distribution .section-heading {
  margin-top: 28px;
}
.profile-distribution h2 {
  font-size: 22px;
}
.profile-related {
  margin-top: 30px;
}
.profile-related > div {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.compact .profile-heading h1 {
  font-size: 36px;
}
.compact .profile-body {
  gap: 22px;
  grid-template-columns: minmax(0, 1.35fr) minmax(220px, 0.9fr);
}
.compact .profile-info {
  padding: 18px;
}
.compact .profile-photo :deep(.gallery-window) {
  height: 460px;
}
@media (max-width: 1050px) {
  .compact .profile-body {
    grid-template-columns: 1fr;
  }
  .compact .profile-info dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 20px;
  }
  .compact .profile-note {
    display: none;
  }
}
@media (max-width: 650px) {
  .profile-heading {
    display: block;
  }
  .profile-heading .button {
    margin-top: 20px;
  }
  .profile-heading h1 {
    font-size: 38px;
  }
  .profile-body {
    display: block;
  }
  .profile-info {
    padding: 20px;
    margin-top: 12px;
  }
  .profile-info dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 20px;
  }
  .profile-note {
    display: none;
  }
  .profile-info dd {
    font-size: 12px;
  }
  .latin-name {
    font-size: 17px;
  }
}
</style>
