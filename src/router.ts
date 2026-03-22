import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { STATIC_MODE } from "./env";
import AdminView from "./views/AdminView.vue";
import ArticleView from "./views/ArticleView.vue";
import BbsView from "./views/BbsView.vue";
import MapView from "./views/MapView.vue";
import PlantDetailView from "./views/PlantDetailView.vue";
import SearchView from "./views/SearchView.vue";
import TaxonView from "./views/TaxonView.vue";
import TimelineView from "./views/TimelineView.vue";

const router = createRouter({
  history: STATIC_MODE ? createWebHashHistory() : createWebHistory(),
  routes: [
    { path: "/", name: "map", component: MapView },
    { path: "/taxon", name: "taxon", component: TaxonView },
    { path: "/search", name: "search", component: SearchView },
    { path: "/plant/:name", name: "plant-detail", component: PlantDetailView },
    { path: "/timeline", name: "timeline", component: TimelineView },
    { path: "/articles", name: "articles", component: ArticleView },
    { path: "/bbs", name: "bbs", component: BbsView },
    { path: "/admin", name: "admin", component: AdminView },
  ],
});

export default router;
