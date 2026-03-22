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

export const api = {
  getArticles: () => request<ArticleSummary[]>("/articles"),
  getArticle: (slug: string) => request<ArticleDetail>(`/articles/${encodeURIComponent(slug)}`),
  getSiteProfile: () => request<SiteProfile>("/site/profile"),
  getSiteStats: () => request<SiteStats>("/stats"),
  addVisit: () => request<SiteStats>("/stats/visit", { method: "POST" }),
  getMapPoints: () => request<FeatureCollection>("/map/points"),
  getMapConfig: () => request<MapConfig>("/map/config"),
  getBaiduHealth: () => request<BaiduHealth>("/map/baidu-health"),
  getTaxonTree: () => request<TaxonNode[]>("/taxon/tree"),
  getPlants: (keyword = "") => request<PlantInfo[]>(`/plants?keyword=${encodeURIComponent(keyword)}`),
  getPlant: (name: string) => request<PlantInfo>(`/plants/${encodeURIComponent(name)}`),
  getTimeline: () => request<TimelineItem[]>("/timeline"),
  getBbsSettings: () => request<BbsSettings>("/bbs/settings"),
  getBbsPosts: () => request<BbsPost[]>("/bbs/posts"),
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
