<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "./api";
import type { SiteProfile } from "./types";

const totalVisits = ref<number | null>(null);
const profile = ref<SiteProfile>({
  title: "素不莳花",
  slogan: "为每一个喜爱植物的你",
  org: "同济大学植物资源网 项目组",
  address: "上海市杨浦区四平路1239号",
  email: "tongjiplants@163.com",
  beian: "粤ICP备18127149号",
  beianUrl: "https://beian.miit.gov.cn/",
});

onMounted(async () => {
  const [visit, siteProfile] = await Promise.all([api.addVisit(), api.getSiteProfile()]);
  totalVisits.value = visit.totalVisits;
  profile.value = siteProfile;
});
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="brand-row">
        <img class="brand-logo" src="/legacy/images/PRT-.png" alt="素不莳花" />
        <div class="brand-subtitle">{{ profile.slogan }}</div>
      </div>
      <nav class="site-nav">
        <RouterLink to="/">植 物 地 图</RouterLink>
        <RouterLink to="/taxon">分 类 系 统</RouterLink>
        <RouterLink to="/search">植 物 检 索</RouterLink>
        <RouterLink to="/timeline">植 物 变 迁</RouterLink>
        <RouterLink to="/articles">文 章 精 选</RouterLink>
        <RouterLink to="/bbs">留 言 板</RouterLink>
      </nav>
    </header>

    <main class="site-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <img src="/legacy/images/PRT-.png" alt="素不莳花" />
      <div v-if="totalVisits !== null">欢迎您！本网站的第 {{ totalVisits }} 位访客</div>
      <div>© {{ profile.org }}</div>
      <div>地址：{{ profile.address }}</div>
      <div>E-mail:{{ profile.email }}</div>
    </footer>
  </div>
</template>
