export type PlantFeature = {
  type: "Feature";
  properties: {
    code_id: string;
    scientific_name: string;
    chinese_name: string;
    category: string;
    family: string;
    fruit_period: string;
    flower_period: string;
    color: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: PlantFeature[];
};

export type PlantInfo = PlantFeature["properties"] & {
  points?: PlantFeature[];
  imageCandidates?: string[];
  imageUrl?: string;
  description?: string;
  related?: Array<{
    chinese_name: string;
    scientific_name: string;
  }>;
};

export type TaxonNode = {
  familyName: string;
  genera: Array<{
    genusName: string;
    species: string[];
  }>;
};

export type TimelineItem = {
  time: string;
  content: string;
};

export type BbsReply = {
  id: number;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
};

export type BbsPost = {
  id: number;
  author: string;
  qq?: string;
  email: string;
  homepage?: string;
  face?: number;
  title: string;
  content: string;
  createdAt: string;
  audit?: "pending" | "approved" | "rejected";
  ip?: string;
  status?: "visible" | "hidden";
  replies: BbsReply[];
};

export type AdminSummary = {
  totalPosts: number;
  visiblePosts: number;
  hiddenPosts: number;
  pendingPosts?: number;
};

export type BbsSettings = {
  pageSize: number;
  requireAudit: boolean;
  sanitizeHtml: boolean;
};

export type MapConfig = {
  baidu: {
    enabled: boolean;
    ak: string;
  };
  providers: Array<{ id: string; label: string }>;
};

export type BaiduHealth = {
  ok: boolean;
  checks: Array<{
    key: string;
    pass: boolean;
    message: string;
  }>;
};

export type SiteStats = {
  totalVisits: number;
};

export type SiteProfile = {
  title: string;
  slogan: string;
  org: string;
  address: string;
  email: string;
  beian: string;
  beianUrl: string;
};

export type ArticleSummary = {
  slug: string;
  title: string;
  markdownPath: string;
  coverImage: string;
};

export type ArticleDetail = {
  slug: string;
  title: string;
  markdown: string;
  markdownPath: string;
  basePath: string;
  coverImage: string;
};
