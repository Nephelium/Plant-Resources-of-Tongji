<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "./api";
import AppIcon from "./components/AppIcon.vue";
import ThemeControl from "./components/ThemeControl.vue";
import type { SiteProfile } from "./types";
const route = useRoute();
const menuOpen = ref(false);
const menuButton = ref<HTMLButtonElement>();
const links = [
  { to: "/", label: "植物地图" },
  { to: "/taxon", label: "分类系统" },
  { to: "/search", label: "植物检索" },
  { to: "/timeline", label: "植物变迁" },
  { to: "/articles", label: "文章精选" },
  { to: "/bbs", label: "留言板" },
];
const profile = ref<SiteProfile>({
  title: "素不莳花",
  slogan: "为每一个喜爱植物的你",
  org: "同济大学植物资源网 项目组",
  address: "上海市杨浦区四平路1239号",
  email: "tongjiplants@163.com",
  beian: "粤ICP备18127149号",
  beianUrl: "https://beian.miit.gov.cn/",
});
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  },
);
function closeMenu() {
  menuOpen.value = false;
  menuButton.value?.focus();
}
function skipToContent() {
  const main = document.getElementById("main-content");
  main?.focus();
  main?.scrollIntoView({ block: "start" });
}
onMounted(async () => {
  const results = await Promise.allSettled([
    api.getSiteProfile(),
    api.addVisit(),
  ]);
  if (results[0].status === "fulfilled") profile.value = results[0].value;
});
</script>

<template>
  <div class="site-shell">
    <a class="skip-link" href="#main-content" @click.prevent="skipToContent"
      >跳到主要内容</a
    >
    <header class="site-header" @keydown.esc="closeMenu">
      <div class="header-inner">
        <RouterLink to="/" class="brand" aria-label="素不莳花首页">
          <span class="brand-mark"><AppIcon name="leaf" :size="29" /></span>
          <span
            ><strong>{{ profile.title }}</strong
            ><small>同济大学植物资源</small></span
          >
        </RouterLink>
        <nav
          id="main-nav"
          class="site-nav"
          :class="{ 'is-open': menuOpen }"
          aria-label="主导航"
        >
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :class="{
              active:
                route.path === link.to ||
                (link.to === '/search' && route.name === 'plant-detail'),
            }"
            >{{ link.label }}</RouterLink
          >
        </nav>
        <RouterLink to="/search" class="header-search" aria-label="查找植物"
          ><AppIcon name="search" /><span>发现草木</span></RouterLink
        >
        <ThemeControl />
        <button
          ref="menuButton"
          class="menu-toggle icon-button"
          :aria-expanded="menuOpen"
          aria-controls="main-nav"
          :aria-label="menuOpen ? '收起导航' : '展开导航'"
          @click="menuOpen = !menuOpen"
        >
          <AppIcon :name="menuOpen ? 'close' : 'menu'" />
        </button>
      </div>
    </header>
    <main id="main-content" class="site-main" tabindex="-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in"
          ><component :is="Component" :key="route.path"
        /></Transition>
      </RouterView>
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <AppIcon name="leaf" :size="32" />
          <div>
            <strong>{{ profile.title }}</strong>
            <p>{{ profile.slogan }}</p>
          </div>
        </div>
        <div class="footer-about">
          <span class="eyebrow">在校园里，遇见自然</span>
          <p>{{ profile.address }}</p>
          <a :href="'mailto:' + profile.email"
            >{{ profile.email }} <AppIcon name="arrow" :size="14"
          /></a>
        </div>
        <div class="footer-credits">
          <p>植物分类及调绘：井立文</p>
          <p>植物坐标定位及网站制作：蔡昕芷、王健</p>
          <RouterLink to="/articles"
            >读一篇植物手记 <AppIcon name="arrow" :size="14"
          /></RouterLink>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© {{ profile.org }}</span
        ><span>PLANT RESOURCES OF TONGJI</span>
      </div>
    </footer>
  </div>
</template>
