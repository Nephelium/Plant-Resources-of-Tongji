<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "./api";
import { ASSET_BASE } from "./env";
import type { SiteProfile } from "./types";

const brandImage = `${ASSET_BASE}legacy/images/PRT-.png`;
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
  const [, siteProfile] = await Promise.all([api.addVisit(), api.getSiteProfile()]);
  profile.value = siteProfile;
});
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <div class="brand-row">
        <img class="brand-logo" :src="brandImage" alt="素不莳花" />
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
      <img :src="brandImage" alt="素不莳花" />
      <div>© {{ profile.org }}</div>
      <div>地址：{{ profile.address }}</div>
      <div>E-mail:{{ profile.email }}</div>
      <div>植物分类及调绘：井立文</div>
      <div>植物坐标定位及网站制作：蔡昕芷、王健</div>
    </footer>
  </div>
</template>
