import type {
  ArticleDetail,
  ArticleSummary,
  AdminSummary,
  BaiduHealth,
  BbsPost,
  BbsSettings,
  FeatureCollection,
  MapConfig,
  PlantInfo,
  SiteProfile,
  SiteStats,
  TaxonNode,
  TimelineItem,
} from "./types";
import { STATIC_MODE } from "./env";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE ?? "http://localhost:3000/api").trim();
const API_BASE = RAW_API_BASE.endsWith("/") ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return (await response.json()) as T;
}

type LegacyPlantFeature = FeatureCollection["features"][number];

const staticProfile: SiteProfile = {
  title: "素不莳花",
  slogan: "为每一个喜爱植物的你",
  org: "同济大学植物资源网 项目组",
  address: "上海市杨浦区四平路1239号",
  email: "tongjiplants@163.com",
  beian: "粤ICP备18127149号",
  beianUrl: "https://beian.miit.gov.cn/",
};

const staticTimeline: TimelineItem[] = [];

let legacyPointsCache: FeatureCollection | null = null;

const loadLegacyPoints = async (): Promise<FeatureCollection> => {
  if (legacyPointsCache) {
    return legacyPointsCache;
  }
  const text = await fetch("/legacy/data/ligneous_plants.geojson.js").then((r) => r.text());
  const jsonText = text.replace(/^\s*var\s+\w+\s*=\s*/i, "").trim();
  const parsed = JSON.parse(jsonText) as FeatureCollection;
  legacyPointsCache = parsed;
  return parsed;
};

const buildTaxonTreeFromPoints = (points: FeatureCollection): TaxonNode[] => {
  const familyMap = new Map<string, Map<string, Set<string>>>();
  for (const feature of points.features) {
    const family = (feature.properties.category || "未知科").trim();
    const genus = (feature.properties.family || "未知属").trim();
    const species = (feature.properties.chinese_name || "").trim();
    if (!familyMap.has(family)) {
      familyMap.set(family, new Map());
    }
    const genusMap = familyMap.get(family)!;
    if (!genusMap.has(genus)) {
      genusMap.set(genus, new Set());
    }
    if (species) {
      genusMap.get(genus)!.add(species);
    }
  }
  return [...familyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
    .map(([familyName, genusMap]) => ({
      familyName,
      genera: [...genusMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
        .map(([genusName, speciesSet]) => ({
          genusName,
          species: [...speciesSet].sort((a, b) => a.localeCompare(b, "zh-CN")),
        })),
    }));
};

const buildPlantsFromPoints = (points: FeatureCollection): PlantInfo[] => {
  const groups = new Map<string, LegacyPlantFeature[]>();
  for (const feature of points.features) {
    const key = feature.properties.chinese_name;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(feature);
  }
  return [...groups.entries()]
    .map(([chinese_name, list]) => {
      const first = list[0];
      return {
        code_id: first.properties.code_id,
        chinese_name,
        scientific_name: first.properties.scientific_name,
        category: first.properties.category,
        family: first.properties.family,
        flower_period: first.properties.flower_period,
        fruit_period: first.properties.fruit_period,
        color: first.properties.color,
        imageUrl: `/legacy/images/plants/${encodeURIComponent(chinese_name)}.jpg`,
        points: list,
      } as PlantInfo;
    })
    .sort((a, b) => a.chinese_name.localeCompare(b.chinese_name, "zh-CN"));
};

const readStaticVisits = () => Number(localStorage.getItem("tongjiplants_static_visits") ?? "0");
const writeStaticVisits = (count: number) => localStorage.setItem("tongjiplants_static_visits", String(count));

const getStaticArticles = async (): Promise<ArticleSummary[]> => {
  try {
    return await fetch("/articles/index.json").then((r) => r.json());
  } catch {
    return [];
  }
};

export const api = {
  getArticles: async () => {
    if (STATIC_MODE) {
      return getStaticArticles();
    }
    return request<ArticleSummary[]>("/articles");
  },
  getArticle: async (slug: string) => {
    if (STATIC_MODE) {
      const articles = await getStaticArticles();
      const hit = articles.find((item) => item.slug === slug);
      const markdownPath = hit?.markdownPath || `/articles/${encodeURIComponent(slug)}/index.md`;
      const markdown = await fetch(markdownPath).then((r) => r.text());
      return {
        slug,
        title: hit?.title ?? slug,
        markdown,
        markdownPath,
        basePath: `/articles/${encodeURIComponent(slug)}/`,
        coverImage: hit?.coverImage ?? "",
      } satisfies ArticleDetail;
    }
    return request<ArticleDetail>(`/articles/${encodeURIComponent(slug)}`);
  },
  getSiteProfile: async () => {
    if (STATIC_MODE) {
      return staticProfile;
    }
    return request<SiteProfile>("/site/profile");
  },
  getSiteStats: async () => {
    if (STATIC_MODE) {
      return { totalVisits: readStaticVisits() };
    }
    return request<SiteStats>("/stats");
  },
  addVisit: async () => {
    if (STATIC_MODE) {
      const next = readStaticVisits() + 1;
      writeStaticVisits(next);
      return { totalVisits: next };
    }
    return request<SiteStats>("/stats/visit", { method: "POST" });
  },
  getMapPoints: async () => {
    if (STATIC_MODE) {
      return loadLegacyPoints();
    }
    return request<FeatureCollection>("/map/points");
  },
  getMapConfig: async () => {
    if (STATIC_MODE) {
      return {
        baidu: { enabled: false, ak: "" },
        providers: [{ id: "osm", label: "OpenStreetMap" }],
      } satisfies MapConfig;
    }
    return request<MapConfig>("/map/config");
  },
  getBaiduHealth: async () => {
    if (STATIC_MODE) {
      return {
        ok: true,
        checks: [{ key: "static-mode", pass: true, message: "静态展示模式：未启用后端地图服务" }],
      } satisfies BaiduHealth;
    }
    return request<BaiduHealth>("/map/baidu-health");
  },
  getTaxonTree: async () => {
    if (STATIC_MODE) {
      const points = await loadLegacyPoints();
      return buildTaxonTreeFromPoints(points);
    }
    return request<TaxonNode[]>("/taxon/tree");
  },
  getPlants: async (keyword = "") => {
    if (STATIC_MODE) {
      const points = await loadLegacyPoints();
      const plants = buildPlantsFromPoints(points);
      const kw = keyword.trim().toLowerCase();
      if (!kw) {
        return plants;
      }
      return plants.filter(
        (item) =>
          item.chinese_name.toLowerCase().includes(kw) ||
          item.scientific_name.toLowerCase().includes(kw) ||
          item.family.toLowerCase().includes(kw) ||
          item.category.toLowerCase().includes(kw)
      );
    }
    return request<PlantInfo[]>(`/plants?keyword=${encodeURIComponent(keyword)}`);
  },
  getPlant: async (name: string) => {
    if (STATIC_MODE) {
      const points = await loadLegacyPoints();
      const plants = buildPlantsFromPoints(points);
      const hit = plants.find((item) => item.chinese_name === name);
      if (!hit) {
        throw new Error("请求失败: 404");
      }
      return hit;
    }
    return request<PlantInfo>(`/plants/${encodeURIComponent(name)}`);
  },
  getTimeline: async () => {
    if (STATIC_MODE) {
      return staticTimeline;
    }
    return request<TimelineItem[]>("/timeline");
  },
  getBbsSettings: async () => {
    if (STATIC_MODE) {
      return { pageSize: 10, requireAudit: false, sanitizeHtml: true };
    }
    return request<BbsSettings>("/bbs/settings");
  },
  getBbsPosts: async () => {
    if (STATIC_MODE) {
      return [];
    }
    return request<BbsPost[]>("/bbs/posts");
  },
  adminLogin: (payload: { username: string; password: string }) =>
    request<{ token: string }>("/admin/login", { method: "POST", body: JSON.stringify(payload) }),
  createPost: (payload: {
    author: string;
    email: string;
    face?: number;
    title: string;
    content: string;
  }) =>
    request<BbsPost>("/bbs/posts", { method: "POST", body: JSON.stringify(payload) }),
  createReply: (postId: number, payload: { author: string; content: string }) =>
    request(`/bbs/posts/${postId}/replies`, { method: "POST", body: JSON.stringify(payload) }),
  getAdminSummary: (token: string) =>
    request<AdminSummary>(`/admin/summary?token=${encodeURIComponent(token)}`),
  getAdminPosts: (token: string) =>
    request<BbsPost[]>(`/admin/bbs/posts?token=${encodeURIComponent(token)}`),
  updateAdminPost: (token: string, postId: number, action: "hide" | "show" | "delete" | "approve" | "reject") =>
    request(`/admin/bbs/posts/${postId}?token=${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }),
  updateAdminBbsSettings: (token: string, payload: BbsSettings) =>
    request(`/admin/bbs/settings?token=${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateSiteProfile: (token: string, payload: SiteProfile) =>
    request(`/admin/site/profile?token=${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  importWechatArticle: (token: string, url: string) =>
    request<ArticleSummary>(`/admin/articles/import?token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
};
