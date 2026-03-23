<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { marked } from "marked";
import { api } from "../api";
import type { ArticleDetail, ArticleSummary } from "../types";

const ARTICLE_FONT_KEY = "tongjiplants_article_font_size";
const ARTICLE_IMAGE_KEY = "tongjiplants_article_image_width";
const ARTICLE_LINE_HEIGHT_KEY = "tongjiplants_article_line_height";
const articles = ref<ArticleSummary[]>([]);
const current = ref<ArticleDetail | null>(null);
const loading = ref(false);
const fontSize = ref(22);
const imageMaxWidth = ref(560);
const lineHeight = ref(1.9);

const contentHtml = computed(() => {
  if (!current.value) {
    return "";
  }
  const html = marked.parse(current.value.markdown, { async: false }) as string;
  const normalizedQuotes = html.replace(/[‘’＇]/g, "'");
  const normalizedVar = normalizedQuotes.replace(/\bvar\./gi, '<span class="latin-var">var.</span>');
  const normalizedQuoted = normalizedVar.replace(/'([^'<>\n]+)'/g, `<span class="no-italic-quote">'$1'</span>`);
  return normalizedQuoted.replace(/src="(?!https?:\/\/|\/)([^"]+)"/g, `src="${current.value.basePath}$1"`);
});

const loadArticle = async (slug: string) => {
  loading.value = true;
  try {
    current.value = await api.getArticle(slug);
  } finally {
    loading.value = false;
  }
};

const articleStyle = computed(() => ({
  "--article-font-size": `${fontSize.value}px`,
  "--article-image-max": `${imageMaxWidth.value}px`,
  "--article-line-height": `${lineHeight.value}`,
}));

const persistReaderStyle = () => {
  localStorage.setItem(ARTICLE_FONT_KEY, String(fontSize.value));
  localStorage.setItem(ARTICLE_IMAGE_KEY, String(imageMaxWidth.value));
  localStorage.setItem(ARTICLE_LINE_HEIGHT_KEY, String(lineHeight.value));
};

const increaseFont = () => {
  fontSize.value = Math.min(30, fontSize.value + 1);
  persistReaderStyle();
};

const decreaseFont = () => {
  fontSize.value = Math.max(15, fontSize.value - 1);
  persistReaderStyle();
};

const enlargeImage = () => {
  imageMaxWidth.value = Math.min(900, imageMaxWidth.value + 40);
  persistReaderStyle();
};

const shrinkImage = () => {
  imageMaxWidth.value = Math.max(320, imageMaxWidth.value - 40);
  persistReaderStyle();
};

const increaseLineHeight = () => {
  lineHeight.value = Math.min(2.4, Number((lineHeight.value + 0.1).toFixed(2)));
  persistReaderStyle();
};

const decreaseLineHeight = () => {
  lineHeight.value = Math.max(1.4, Number((lineHeight.value - 0.1).toFixed(2)));
  persistReaderStyle();
};

onMounted(async () => {
  const savedFont = Number(localStorage.getItem(ARTICLE_FONT_KEY) ?? "");
  const savedImage = Number(localStorage.getItem(ARTICLE_IMAGE_KEY) ?? "");
  const savedLine = Number(localStorage.getItem(ARTICLE_LINE_HEIGHT_KEY) ?? "");
  if (!Number.isNaN(savedFont) && savedFont >= 15 && savedFont <= 30) {
    fontSize.value = savedFont;
  }
  if (!Number.isNaN(savedImage) && savedImage >= 320 && savedImage <= 900) {
    imageMaxWidth.value = savedImage;
  }
  if (!Number.isNaN(savedLine) && savedLine >= 1.4 && savedLine <= 2.4) {
    lineHeight.value = savedLine;
  }
  articles.value = await api.getArticles();
  if (articles.value.length) {
    await loadArticle(articles.value[0].slug);
  }
});
</script>

<template>
  <section class="article-layout">
    <aside class="section-panel article-list">
      <h3>文章列表</h3>
      <button v-for="item in articles" :key="item.slug" class="article-item" @click="loadArticle(item.slug)">
        {{ item.title }}
      </button>
    </aside>
    <article class="section-panel article-content">
      <div class="reader-toolbar">
        <span>阅读设置</span>
        <button class="tool-btn" @click="decreaseFont">A-</button>
        <button class="tool-btn" @click="increaseFont">A+</button>
        <button class="tool-btn" @click="shrinkImage">图片-</button>
        <button class="tool-btn" @click="enlargeImage">图片+</button>
        <button class="tool-btn" @click="decreaseLineHeight">行距-</button>
        <button class="tool-btn" @click="increaseLineHeight">行距+</button>
      </div>
      <template v-if="loading">
        <p>加载中...</p>
      </template>
      <template v-else-if="current">
        <div class="markdown-body" :style="articleStyle" v-html="contentHtml"></div>
      </template>
      <template v-else>
        <p>请在左侧选择文章。</p>
      </template>
    </article>
  </section>
</template>

<style scoped>
.article-layout {
  display: grid;
  grid-template-columns: 28% 1fr;
  gap: 12px;
  min-height: 640px;
}

.article-list {
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 8px;
}

.article-item {
  width: 100%;
  min-height: 40px;
  text-align: left;
}

.article-content {
  padding: 22px;
}

.reader-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #2f6258;
  font-size: 14px;
}

.tool-btn {
  min-width: 58px;
  height: 32px;
  padding: 0 12px;
}

.markdown-body {
  color: #244f47;
  line-height: 1.85;
}

.markdown-body :deep(p),
.markdown-body :deep(li),
.markdown-body :deep(blockquote),
.markdown-body :deep(td),
.markdown-body :deep(th),
.markdown-body :deep(span),
.markdown-body :deep(div) {
  font-size: var(--article-font-size, 22px) !important;
  line-height: var(--article-line-height, 1.9);
}

.markdown-body :deep(img) {
  display: block;
  float: none !important;
  clear: both;
  position: static !important;
  max-width: min(var(--article-image-max, 560px), 100%);
  border-radius: 12px;
  margin: 14px 0;
}

.markdown-body :deep(h1) {
  font-size: 34px !important;
  margin-top: 18px;
}

.markdown-body :deep(h2) {
  font-size: 30px !important;
  margin-top: 18px;
}

.markdown-body :deep(h3) {
  font-size: 26px !important;
  margin-top: 18px;
}

.markdown-body :deep(table),
.markdown-body :deep(thead),
.markdown-body :deep(tbody),
.markdown-body :deep(tr),
.markdown-body :deep(th),
.markdown-body :deep(td) {
  display: revert;
  width: auto;
}

.markdown-body :deep(table) {
  width: 100%;
  max-width: 980px;
  border-collapse: collapse;
  margin: 10px 0 22px;
  table-layout: auto;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 10px;
}

.markdown-body :deep(thead) {
  display: table-header-group;
}

.markdown-body :deep(tr) {
  display: table-row;
}

.markdown-body :deep(td),
.markdown-body :deep(th) {
  position: static !important;
  padding: 4px 10px;
  border-bottom: 1px solid rgba(132, 183, 168, 0.2);
  white-space: normal;
  vertical-align: top;
  line-height: 1.35 !important;
  font-size: 20px !important;
}

.markdown-body :deep(td:first-child),
.markdown-body :deep(th:first-child) {
  width: 220px;
  min-width: 180px;
  font-weight: 700;
  color: #1caea0;
  white-space: nowrap;
}

.markdown-body :deep(td + td),
.markdown-body :deep(th + th) {
  min-width: 320px;
  color: #a8a8a8;
  font-style: italic;
}

.markdown-body :deep(td *),
.markdown-body :deep(th *) {
  position: static !important;
  float: none !important;
  left: auto !important;
  top: auto !important;
  line-height: 1.35 !important;
  margin: 0 !important;
}

.markdown-body :deep(.latin-var) {
  font-style: normal !important;
}

.markdown-body :deep(.no-italic-quote) {
  font-style: normal !important;
}

.markdown-body :deep(*) {
  max-width: 100%;
}

@media (max-width: 980px) {
  .article-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .article-list {
    max-height: 280px;
    overflow-y: auto;
  }

  .article-content {
    padding: 14px;
  }

  .reader-toolbar {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .reader-toolbar {
    gap: 6px;
  }

  .tool-btn {
    min-width: 52px;
    height: 30px;
    padding: 0 10px;
    font-size: 12px;
  }

  .markdown-body :deep(h1) {
    font-size: 28px !important;
  }

  .markdown-body :deep(h2) {
    font-size: 24px !important;
  }

  .markdown-body :deep(h3) {
    font-size: 20px !important;
  }

  .markdown-body :deep(td),
  .markdown-body :deep(th) {
    padding: 4px 6px;
    font-size: 16px !important;
  }
}
</style>
