<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import type { ArticleDetail, ArticleSummary } from "../types";
import AppIcon from "../components/AppIcon.vue";
import PageHeading from "../components/PageHeading.vue";
import {
  articleCategory,
  articleEditorial,
  articleCover,
  renderArticle,
} from "../utils/articles";
import { readPreference, writePreference } from "../utils/storage";
const route = useRoute(),
  router = useRouter();
const articles = ref<ArticleSummary[]>([]),
  current = ref<ArticleDetail | null>(null);
const loading = ref(true),
  reading = ref(false),
  error = ref(""),
  articleError = ref("");
const category = ref("全部"),
  keyword = ref("");
const reader = ref<HTMLElement>(),
  progress = ref(0);
function savedNumber(key: string, fallback: number, min: number, max: number) {
  const n = Number(readPreference(key, String(fallback)));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
const fontSize = ref(savedNumber("tongjiplants_article_font_size", 18, 15, 30));
const imageWidth = ref(
  savedNumber("tongjiplants_article_image_width", 680, 320, 900),
);
const lineHeight = ref(
  savedNumber("tongjiplants_article_line_height", 1.9, 1.4, 2.4),
);
let requestId = 0,
  progressFrame = 0;
const slug = computed(() => String(route.query.article || ""));
const filtered = computed(() =>
  [...articles.value]
    .sort((a, b) => articleEditorial(a).order - articleEditorial(b).order)
    .filter(
      (a) =>
        (category.value === "全部" || articleCategory(a) === category.value) &&
        a.title.toLowerCase().includes(keyword.value.trim().toLowerCase()),
    ),
);
const rendered = computed(() =>
  current.value ? renderArticle(current.value) : { html: "", toc: [] },
);
const currentIndex = computed(() =>
  articles.value.findIndex((a) => a.slug === slug.value),
);
const adjacent = computed(() => articles.value[currentIndex.value + 1]);
const readerStyle = computed(() => ({
  "--article-font-size": fontSize.value + "px",
  "--article-image-max": imageWidth.value + "px",
  "--article-line-height": String(lineHeight.value),
}));
watch([fontSize, imageWidth, lineHeight], () => {
  writePreference("tongjiplants_article_font_size", String(fontSize.value));
  writePreference("tongjiplants_article_image_width", String(imageWidth.value));
  writePreference("tongjiplants_article_line_height", String(lineHeight.value));
});
async function loadList() {
  loading.value = true;
  error.value = "";
  try {
    articles.value = await api.getArticles();
  } catch {
    error.value = "文章目录暂时没有加载成功。";
  } finally {
    loading.value = false;
  }
}
async function loadArticle() {
  const id = ++requestId;
  current.value = null;
  articleError.value = "";
  progress.value = 0;
  if (!slug.value) {
    reading.value = false;
    return;
  }
  reading.value = true;
  try {
    const data = await api.getArticle(slug.value);
    if (id === requestId) {
      current.value = data;
      await nextTick();
      updateProgress();
    }
  } catch {
    if (id === requestId)
      articleError.value = "这篇文章暂时无法打开，请重试或选择其他文章。";
  } finally {
    if (id === requestId) reading.value = false;
  }
}
function openArticle(value: string) {
  void router.push({ query: { article: value } });
  window.scrollTo({ top: 0 });
}
function updateProgress() {
  cancelAnimationFrame(progressFrame);
  progressFrame = requestAnimationFrame(() => {
    if (!reader.value) {
      progress.value = 0;
      return;
    }
    const rect = reader.value.getBoundingClientRect();
    const offset =
      (document.querySelector(".site-header")?.getBoundingClientRect().height ??
        77) + 20;
    const distance = rect.height - window.innerHeight + offset;
    progress.value =
      distance > 0
        ? Math.min(100, Math.max(0, ((offset - rect.top) / distance) * 100))
        : 100;
  });
}
function goToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: "start" });
}
function backTop() {
  window.scrollTo({ top: 0 });
}
function resetReader() {
  fontSize.value = 18;
  imageWidth.value = 680;
  lineHeight.value = 1.9;
}
watch(slug, loadArticle);
onMounted(async () => {
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  await Promise.all([loadList(), loadArticle()]);
});
onBeforeUnmount(() => {
  requestId++;
  cancelAnimationFrame(progressFrame);
  window.removeEventListener("scroll", updateProgress);
  window.removeEventListener("resize", updateProgress);
});
</script>
<template>
  <section>
    <template v-if="!slug">
      <PageHeading
        eyebrow="FIELD NOTES / 校园自然手记"
        title="草木之间，有故事发生"
        description="把调绘时的脚步、枝叶间的发现，还有名字背后的学问，一页页记下来。"
        ><span class="badge">{{ articles.length }} 篇手记</span></PageHeading
      >
      <div class="article-filters">
        <div role="group" aria-label="文章分类">
          <button
            v-for="name in ['全部', '校园手记', '名字与学问']"
            :key="name"
            class="chip"
            :aria-pressed="category === name"
            @click="category = name"
          >
            {{ name }}
          </button>
        </div>
        <label class="search-field"
          ><AppIcon name="search" :size="17" /><input
            v-model="keyword"
            type="search"
            aria-label="搜索文章标题"
            placeholder="寻找一篇手记"
        /></label>
      </div>
      <div v-if="error" class="error-state" role="alert">
        {{ error }} <button @click="loadList">重新加载</button>
      </div>
      <div v-else-if="loading" class="articles-grid">
        <div v-for="n in 6" :key="n" class="skeleton"></div>
      </div>
      <div v-else-if="!filtered.length" class="empty-state section-panel">
        <AppIcon name="book" :size="40" />
        <h2>没有匹配的手记</h2>
        <p>换个关键词，或浏览全部文章。</p>
        <button
          @click="
            keyword = '';
            category = '全部';
          "
        >
          浏览全部手记
        </button>
      </div>
      <div v-else class="articles-grid">
        <RouterLink
          v-for="(item, i) in filtered"
          :key="item.slug"
          :to="{ query: { article: item.slug } }"
          class="article-card"
          :class="{
            featured: i === 0 && category === '全部' && !keyword.trim(),
          }"
          v-reveal
          ><div
            class="article-cover"
            :class="{ 'text-cover': !articleCover(item) }"
          >
            <img
              v-if="articleCover(item)"
              :src="articleCover(item)"
              :alt="item.title + ' · 主题插画'"
              :loading="i < 2 ? 'eager' : 'lazy'"
              decoding="async"
              width="1536"
              height="1024"
            /><template v-else
              ><AppIcon name="book" :size="46" /><span>{{
                item.title.includes("资源合集")
                  ? "草木收藏夹"
                  : item.title.includes("读音")
                    ? "草木之音"
                    : "草木之名"
              }}</span
              ><small>BOTANICAL NOTES</small></template
            ><span class="article-number">{{
              String(i + 1).padStart(2, "0")
            }}</span>
          </div>
          <div class="article-copy">
            <span class="eyebrow">{{ articleCategory(item) }}</span>
            <h2>
              {{
                item.title
                  .replace(
                    /^地图纪\s*[|｜]\s*(?:(?:番外篇|预告篇)[：:]\s*)?/,
                    "",
                  )
                  .replace(/\s*[|｜]\s*/g, " · ")
              }}
            </h2>
            <p class="article-summary">{{ articleEditorial(item).summary }}</p>
            <span class="article-open"
              >阅读手记 <AppIcon name="arrow" :size="17"
            /></span></div
        ></RouterLink>
      </div>
    </template>
    <template v-else>
      <div
        class="reading-progress"
        :style="{ transform: 'scaleX(' + progress / 100 + ')' }"
      ></div>
      <div class="reader-topbar">
        <RouterLink to="/articles" class="text-link"
          ><AppIcon name="back" :size="16" />全部手记</RouterLink
        ><span class="eyebrow">FIELD NOTES</span
        ><span class="reading-percent">{{ Math.round(progress) }}% 已读</span>
      </div>
      <div
        v-if="reading"
        class="skeleton reader-loading"
        role="status"
        aria-label="正在加载文章"
      ></div>
      <div v-else-if="articleError" class="error-state" role="alert">
        {{ articleError }} <button @click="loadArticle">重新加载</button>
      </div>
      <div v-else-if="current" class="reader-layout">
        <aside class="reader-aside">
          <details class="reader-settings" open>
            <summary>阅读设置</summary>
            <label
              >字号 <span>{{ fontSize }} px</span
              ><input
                v-model.number="fontSize"
                type="range"
                min="15"
                max="30"
                aria-label="文章字号" /></label
            ><label
              >行距 <span>{{ lineHeight.toFixed(1) }}</span
              ><input
                v-model.number="lineHeight"
                type="range"
                min="1.4"
                max="2.4"
                step=".1"
                aria-label="文章行距" /></label
            ><label
              >图片宽度 <span>{{ imageWidth }} px</span
              ><input
                v-model.number="imageWidth"
                type="range"
                min="320"
                max="900"
                step="20"
                aria-label="文章图片宽度" /></label
            ><button @click="resetReader">恢复默认</button>
          </details>
          <nav
            v-if="rendered.toc.length > 1"
            class="article-toc"
            aria-label="文章目录"
          >
            <h3>文章目录</h3>
            <button
              v-for="item in rendered.toc"
              :key="item.id"
              @click="goToSection(item.id)"
            >
              {{ item.text }}
            </button>
          </nav>
          <button class="reader-back-top" @click="backTop">
            <AppIcon name="up" :size="16" />回到文章开头
          </button>
        </aside>
        <article ref="reader" class="reader-paper" :style="readerStyle">
          <img
            v-if="articleCover(current)"
            class="reader-cover"
            :src="articleCover(current)"
            :alt="current.title + ' · 主题插画'"
            width="1536"
            height="1024"
            decoding="async"
          />
          <div class="markdown-body" v-html="rendered.html"></div>
          <div class="article-ending">
            <AppIcon name="leaf" :size="26" /><span>草木常在，慢慢读来。</span>
          </div>
          <button
            v-if="adjacent"
            class="next-article"
            @click="openArticle(adjacent.slug)"
          >
            <span
              ><small>继续阅读</small
              ><strong>{{ adjacent.title }}</strong></span
            ><AppIcon name="arrow" />
          </button>
        </article>
      </div>
    </template>
  </section>
</template>
<style scoped>
.article-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 8px 0 24px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 26px;
}
.article-filters > div {
  display: flex;
  gap: 8px;
}
.article-filters .search-field {
  width: 260px;
}
.article-filters input {
  font-size: 12px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  align-items: stretch;
}
.article-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 24px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 4px 0 var(--card-shadow);
  transition:
    border-color 0.2s,
    box-shadow 0.25s,
    translate 0.25s;
}
.article-card:hover {
  border-color: var(--line-strong);
  box-shadow: 0 9px 0 var(--card-shadow);
  translate: 0 -5px;
}
.article-cover {
  aspect-ratio: 3 / 2;
  position: relative;
  overflow: hidden;
  background: var(--soft);
  flex-shrink: 0;
}
.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s;
}
.article-card:hover img {
  transform: scale(1.045);
}
.text-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  color: var(--primary);
}
.text-cover > span:not(.article-number) {
  font: 28px var(--display);
}
.text-cover small {
  font-size: 10px;
  letter-spacing: 0.2em;
}
.article-number {
  position: absolute;
  top: 16px;
  left: 16px;
  font:
    italic 13px Georgia,
    serif;
  color: white;
  background: #254d3ae8;
  border: 1px solid #ffffff60;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
}
.article-copy {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 24px;
}
.article-copy .eyebrow {
  font-size: 10px;
}
.article-copy h2 {
  font-size: 21px;
  line-height: 1.55;
  letter-spacing: 0;
  margin: 12px 0;
}
.article-summary {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.85;
  margin: 0 0 22px;
}
.article-open {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  border-top: 1px solid var(--line);
  padding-top: 15px;
  margin-top: auto;
}
.article-open svg {
  transition: translate 0.2s;
}
.article-card:hover .article-open svg {
  translate: 4px 0;
}
.article-card.featured {
  grid-column: span 2;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  background: var(--feature-bg);
  color: white;
  border-color: var(--feature-bg);
}
.featured .article-cover {
  height: 100%;
  aspect-ratio: auto;
}
.featured .article-copy {
  justify-content: center;
  padding: clamp(22px, 2.6vw, 40px);
}
.featured .eyebrow {
  color: #bddbc7;
}
.featured h2 {
  font-size: clamp(24px, 2.4vw, 34px);
  line-height: 1.5;
  margin: 18px 0;
}
.featured .article-summary {
  color: #d1e0d6;
  font-size: 14px;
}
.featured .article-open {
  border-color: #ffffff33;
  margin-top: 18px;
}
.reader-cover {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 2.4;
  object-fit: cover;
  border-radius: 14px;
  margin-bottom: 34px;
}
.reading-progress {
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  height: 3px;
  background: var(--pink-accent);
  z-index: 1001;
  transform-origin: left;
}
.reader-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 0 26px;
}
.reading-percent {
  font-size: 10px;
  color: var(--muted);
}
.reader-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 36px;
  align-items: start;
}
.reader-aside {
  position: sticky;
  top: var(--sticky-top);
  max-height: calc(100dvh - var(--sticky-top) - 20px);
  overflow: auto;
}
.reader-settings {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  background: var(--surface);
}
.reader-settings summary {
  cursor: pointer;
  font-size: 13px;
}
.reader-settings label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  margin: 20px 0 0;
  color: var(--muted);
}
.reader-settings input {
  width: 100%;
  min-height: 28px;
  padding: 0;
  accent-color: var(--primary);
  margin: 5px 0 0;
}
.reader-settings button {
  min-height: 34px;
  font-size: 10px;
  padding: 5px 12px;
  margin-top: 12px;
}
.article-toc {
  margin: 25px 0;
}
.article-toc h3 {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}
.article-toc button {
  background: transparent;
  border: 0;
  display: block;
  text-align: left;
  width: 100%;
  font-size: 11px;
  padding: 7px 0;
  min-height: 34px;
}
.article-toc button:hover {
  text-decoration: underline;
}
.reader-back-top {
  border: 0;
  background: transparent;
  padding: 10px 0;
  font-size: 11px;
  color: var(--muted);
}
.reader-paper {
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 44px 52px;
  border-radius: 22px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.markdown-body {
  font-size: var(--article-font-size);
  line-height: var(--article-line-height);
  color: var(--reader-ink);
}
.markdown-body :deep(h1) {
  font-size: clamp(25px, 2.4vw, 35px);
  letter-spacing: 0.03em;
  line-height: 1.6;
  margin: 0 0 32px;
}
.markdown-body :deep(h2) {
  font-size: 1.35em;
  margin: 32px 0 18px;
}
.markdown-body :deep(h3) {
  font-size: 1.15em;
  margin: 28px 0 15px;
}
.markdown-body :deep(p),
.markdown-body :deep(li),
.markdown-body :deep(span),
.markdown-body :deep(section) {
  font-size: inherit;
  line-height: inherit;
}
.markdown-body :deep(p) {
  margin: 0 0 1.15em;
}
.markdown-body :deep(img) {
  width: auto;
  max-width: min(100%, var(--article-image-max));
  height: auto;
  display: block;
  margin: 22px auto;
  border-radius: 5px;
}
.markdown-body :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid #b5c49c;
  margin: 22px 0;
  padding: 12px 22px;
  background: var(--soft);
}
.markdown-body :deep(.article-table) {
  max-width: 100%;
  overflow-x: auto;
  margin: 20px 0;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
}
.markdown-body :deep(td),
.markdown-body :deep(th) {
  padding: 10px 14px;
  border: 1px solid var(--line);
  min-width: 110px;
  text-align: left;
  vertical-align: top;
}
.markdown-body :deep(th) {
  background: var(--soft);
}
.markdown-body :deep(td p) {
  margin: 0;
}
.markdown-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 28px 0;
}
.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 18px;
  background: var(--soft);
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  scroll-margin-top: 0;
}
.article-ending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin: 48px 0;
  color: var(--muted);
  font: 14px var(--display);
}
.next-article {
  width: 100%;
  justify-content: space-between;
  text-align: left;
  padding: 22px;
  background: var(--soft);
}
.next-article small {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--muted);
  margin-bottom: 10px;
}
.next-article strong {
  font: 18px/1.5 var(--display);
}
.reader-loading {
  height: 600px;
}
@media (max-width: 1000px) {
  .articles-grid {
    gap: 20px;
  }
  .article-copy {
    padding: 18px;
  }
  .reader-layout {
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 24px;
  }
  .reader-paper {
    padding: 30px;
  }
}
@media (max-width: 900px) {
  .reading-progress {
    top: var(--header-height);
  }
  .articles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .article-card.featured {
    min-height: 340px;
  }
}
@media (max-width: 700px) {
  .reader-layout {
    display: block;
  }
  .reader-aside {
    position: static;
    max-height: none;
    margin-bottom: 20px;
  }
  .article-toc,
  .reader-back-top {
    display: none;
  }
  .reader-settings {
    padding: 14px;
  }
  .reader-settings label {
    display: inline-flex;
    width: 30%;
    margin: 15px 1% 0;
    font-size: 10px;
  }
  .reader-settings button {
    margin: 10px 0 0 2%;
  }
  .reader-paper {
    padding: 24px 19px;
  }
  .article-filters {
    flex-direction: column;
    align-items: stretch;
  }
  .article-filters .search-field {
    width: 100%;
  }
}
@media (max-width: 600px) {
  .reading-progress {
    top: var(--header-height);
  }
  .articles-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .article-card.featured {
    display: flex;
    grid-column: auto;
    min-height: 0;
  }
  .featured .article-cover {
    height: auto;
    aspect-ratio: 3 / 2;
  }
  .featured .article-copy {
    padding: 24px;
  }
  .featured h2 {
    font-size: 27px;
  }
  .featured .article-open {
    margin-top: 0;
  }
  .article-filters {
    gap: 14px;
    padding-bottom: 18px;
    margin-bottom: 20px;
  }
  .reader-cover {
    aspect-ratio: 3 / 2;
    margin-bottom: 26px;
  }
  .article-copy h2 {
    min-height: 0;
    font-size: 22px;
  }
  .article-copy {
    padding: 22px;
  }
  .reader-topbar > .eyebrow {
    display: none;
  }
  .next-article {
    padding: 16px;
  }
}
</style>
