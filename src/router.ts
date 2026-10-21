import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { BASE_URL, STATIC_MODE } from "./env";
const router = createRouter({
  history: STATIC_MODE
    ? createWebHashHistory(BASE_URL)
    : createWebHistory(BASE_URL),
  routes: [
    {
      path: "/",
      name: "map",
      component: () => import("./views/MapView.vue"),
      meta: { title: "植物地图" },
    },
    {
      path: "/taxon",
      name: "taxon",
      component: () => import("./views/TaxonView.vue"),
      meta: { title: "分类系统" },
    },
    {
      path: "/search",
      name: "search",
      component: () => import("./views/SearchView.vue"),
      meta: { title: "植物检索" },
    },
    {
      path: "/plant/:name",
      name: "plant-detail",
      component: () => import("./views/PlantDetailView.vue"),
      meta: { title: "植物档案" },
    },
    {
      path: "/timeline",
      name: "timeline",
      component: () => import("./views/TimelineView.vue"),
      meta: { title: "植物变迁" },
    },
    {
      path: "/articles",
      name: "articles",
      component: () => import("./views/ArticleView.vue"),
      meta: { title: "文章精选" },
    },
    {
      path: "/bbs",
      name: "bbs",
      component: () => import("./views/BbsView.vue"),
      meta: { title: "留言板" },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("./views/AdminView.vue"),
      meta: { title: "网站管理" },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("./views/NotFoundView.vue"),
      meta: { title: "页面未找到" },
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});
router.afterEach((to) => {
  document.title =
    String(to.params.name || to.meta.title || "校园植物") + " · 素不莳花";
});
export default router;
