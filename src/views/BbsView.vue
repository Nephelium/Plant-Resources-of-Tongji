<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../api";
import { ASSET_BASE, STATIC_MODE } from "../env";
import type { BbsPost, BbsSettings } from "../types";
import PageHeading from "../components/PageHeading.vue";
import AppIcon from "../components/AppIcon.vue";
const posts = ref<BbsPost[]>([]),
  loading = ref(false),
  submitting = ref(false),
  replyBusy = ref<number | null>(null);
const page = ref(1),
  loadError = ref(""),
  submitNotice = ref(""),
  submitError = ref("");
const form = reactive({
  author: "",
  email: "",
  face: 1,
  title: "",
  content: "",
});
const replies = reactive<Record<number, { author: string; content: string }>>(
  {},
);
const settings = ref<BbsSettings>({
  pageSize: 5,
  requireAudit: true,
  sanitizeHtml: true,
});
const faceBase = ASSET_BASE + "legacy/bbs/face/";
const qrcode = ASSET_BASE + "legacy/images/qrcode.jpg";
const copyNotice = ref("");
async function copyEmail() {
  try {
    await navigator.clipboard.writeText("tongjiplants@163.com");
    copyNotice.value = "邮箱已复制";
  } catch {
    copyNotice.value = "请选中下方邮箱地址复制";
  }
}
const totalPages = computed(() =>
  Math.max(1, Math.ceil(posts.value.length / (settings.value.pageSize || 5))),
);
const pagedPosts = computed(() =>
  posts.value.slice(
    (page.value - 1) * (settings.value.pageSize || 5),
    page.value * (settings.value.pageSize || 5),
  ),
);
function replyFor(id: number) {
  return (replies[id] ||= { author: "", content: "" });
}
async function loadPosts() {
  if (STATIC_MODE) return;
  loading.value = true;
  loadError.value = "";
  try {
    const [data, config] = await Promise.all([
      api.getBbsPosts(),
      api.getBbsSettings(),
    ]);
    posts.value = data;
    settings.value = config;
    page.value = Math.min(page.value, totalPages.value);
  } catch {
    loadError.value = "留言暂时没有加载成功，请重试。";
  } finally {
    loading.value = false;
  }
}
async function submitPost() {
  if (STATIC_MODE || submitting.value) return;
  if (
    ![form.author, form.title, form.content, form.email].every((value) =>
      value.trim(),
    )
  ) {
    submitError.value = "请填写昵称、邮箱、标题和留言内容。";
    return;
  }
  submitting.value = true;
  submitError.value = "";
  submitNotice.value = "";
  try {
    await api.createPost({
      ...form,
      author: form.author.trim(),
      email: form.email.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
    });
    Object.assign(form, {
      author: "",
      email: "",
      face: 1,
      title: "",
      content: "",
    });
    submitNotice.value = settings.value.requireAudit
      ? "留言已提交，审核通过后会在这里显示。"
      : "留言已发布。";
    page.value = 1;
    await loadPosts();
  } catch {
    submitError.value = "留言未能提交，内容已保留，可以再试一次。";
  } finally {
    submitting.value = false;
  }
}
async function submitReply(id: number) {
  if (STATIC_MODE || replyBusy.value !== null) return;
  const payload = replyFor(id);
  if (!payload.author.trim() || !payload.content.trim()) {
    submitError.value = "请填写回复昵称和内容。";
    return;
  }
  replyBusy.value = id;
  submitError.value = "";
  try {
    await api.createReply(id, {
      author: payload.author.trim(),
      content: payload.content.trim(),
    });
    replies[id] = { author: "", content: "" };
    submitNotice.value = "回复已提交。";
    await loadPosts();
  } catch {
    submitError.value = "回复未能提交，内容已保留，请重试。";
  } finally {
    replyBusy.value = null;
  }
}
onMounted(loadPosts);
</script>
<template>
  <section>
    <PageHeading
      eyebrow="LET'S TALK ABOUT PLANTS / 草木来信"
      title="你的发现，也值得被记下"
      description="关于一株植物的疑问、一处校园的新变化，或一个让网站更好的建议。"
      ><RouterLink v-if="!STATIC_MODE" to="/admin" class="text-link"
        >留言管理 <AppIcon name="arrow" :size="15" /></RouterLink
    ></PageHeading>

    <div v-if="STATIC_MODE" class="contact-layout">
      <div class="contact-copy">
        <div class="postcard-top">
          <span class="eyebrow">一封寄给草木的信 / A LITTLE NOTE</span
          ><span class="leaf-stamp" aria-hidden="true"
            ><AppIcon name="leaf" :size="32" /><small>TONGJI</small></span
          >
        </div>
        <h2>今天，又遇见了<br /><span>什么新鲜事？</span></h2>
        <p>
          一朵叫不出名字的花，一棵悄悄长高的树。<br />把你的疑问、发现和建议，写信告诉我们。
        </p>
        <div class="contact-actions">
          <a href="mailto:tongjiplants@163.com" class="button button-primary"
            ><AppIcon name="mail" :size="18" />写一封草木来信<AppIcon
              name="arrow"
              :size="18"
          /></a>
          <button class="copy-email" @click="copyEmail">复制邮箱</button>
        </div>
        <div class="contact-address">
          <span class="email-address">tongjiplants@163.com</span
          ><span role="status">{{ copyNotice }}</span>
        </div>
        <div class="letter-tips">
          <AppIcon name="pin" :size="17" /><span
            >辨认植物时，记得带上照片和发现地点。</span
          >
        </div>
      </div>
      <figure class="contact-qr">
        <span class="eyebrow">在这里，继续聊聊</span>
        <div class="qr-frame">
          <img
            :src="qrcode"
            alt="素不莳花公众号二维码"
            width="190"
            height="190"
          />
        </div>
        <figcaption>
          <strong>素不莳花</strong
          ><span>扫码关注公众号<br />一起认识校园草木</span>
        </figcaption>
        <p class="contact-note">本站暂未开放在线留言。</p>
      </figure>
    </div>
    <template v-else>
      <div v-if="submitNotice" class="notice" role="status">
        {{ submitNotice }}
      </div>
      <div v-if="submitError" class="error-state" role="alert">
        {{ submitError }}
      </div>
      <div class="bbs-layout">
        <form class="post-form section-panel" @submit.prevent="submitPost">
          <h2>写下你的发现</h2>
          <div class="form-row">
            <label
              >昵称<input
                v-model="form.author"
                autocomplete="nickname"
                required
                maxlength="30"
                placeholder="怎样称呼你" /></label
            ><label
              >邮箱<input
                v-model="form.email"
                type="email"
                autocomplete="email"
                required
                maxlength="120"
                placeholder="方便联系的邮箱"
            /></label>
          </div>
          <fieldset class="faces">
            <legend>选一张头像</legend>
            <label
              v-for="face in [1, 2, 3, 4, 5, 6, 7]"
              :key="face"
              :class="{ selected: form.face === face }"
              ><input
                v-model="form.face"
                type="radio"
                :value="face"
                :aria-label="'头像' + face" /><img
                :src="faceBase + 'face' + face + '.gif'"
                alt=""
            /></label>
          </fieldset>
          <small class="avatar-note"
            >头像素材已获 @INBing 授权，用于本站留言互动。</small
          ><label
            >标题<input
              v-model="form.title"
              required
              maxlength="60"
              placeholder="给这份发现起个名字" /></label
          ><label
            >留言内容<textarea
              v-model="form.content"
              required
              maxlength="2000"
              rows="6"
              placeholder="说说你看到了什么，或想了解些什么……"
            ></textarea>
          </label>
          <div class="submit-row">
            <span>{{ form.content.length }} / 2000</span
            ><button class="button-primary" :disabled="submitting">
              {{ submitting ? "提交中…" : "提交留言"
              }}<AppIcon name="arrow" :size="16" />
            </button>
          </div>
        </form>
        <aside class="bbs-intro">
          <AppIcon name="leaf" :size="38" />
          <h2>一起留意，<br />一起记录。</h2>
          <p>
            植物辨认时，清晰的叶、花、果实照片，以及发现地点，都会带来帮助。
          </p>
          <p v-if="settings.requireAudit">留言将在审核通过后显示。</p>
        </aside>
      </div>
      <div class="section-heading">
        <h2>草木间的对话</h2>
        <span class="badge">{{ posts.length }} 条留言</span>
      </div>
      <div
        v-if="loading"
        class="skeleton"
        role="status"
        aria-label="正在加载留言"
      ></div>
      <div v-else-if="loadError" class="error-state" role="alert">
        {{ loadError }}<button @click="loadPosts">重新加载</button>
      </div>
      <div v-else-if="!posts.length" class="empty-state section-panel">
        <AppIcon name="mail" :size="36" />
        <h3>等第一封草木来信</h3>
        <p>你的观察，可以成为一段对话的开始。</p>
      </div>
      <article
        v-for="post in pagedPosts"
        :key="post.id"
        class="post-card section-panel"
      >
        <div class="post-author">
          <img :src="faceBase + 'face' + (post.face ?? 1) + '.gif'" alt="" />
          <div>
            <strong>{{ post.author }}</strong
            ><time>{{ new Date(post.createdAt).toLocaleString("zh-CN") }}</time>
          </div>
        </div>
        <h3>{{ post.title }}</h3>
        <p class="post-content">{{ post.content }}</p>
        <div v-if="post.replies.length" class="reply-list">
          <p v-for="reply in post.replies" :key="reply.id">
            <strong>{{ reply.author }}</strong> {{ reply.content }}
          </p>
        </div>
        <details class="reply-details">
          <summary>写一条回复</summary>
          <form @submit.prevent="submitReply(post.id)">
            <label
              >昵称<input
                v-model="replyFor(post.id).author"
                required
                maxlength="30"
                autocomplete="nickname" /></label
            ><label
              >回复内容<textarea
                v-model="replyFor(post.id).content"
                required
                maxlength="1000"
                rows="3"
              ></textarea></label
            ><button :disabled="replyBusy !== null">
              {{ replyBusy === post.id ? "提交中…" : "提交回复" }}
            </button>
          </form>
        </details>
      </article>
      <nav v-if="totalPages > 1" class="bbs-pager" aria-label="留言分页">
        <button :disabled="page <= 1" @click="page--">上一页</button
        ><span>{{ page }} / {{ totalPages }}</span
        ><button :disabled="page >= totalPages" @click="page++">下一页</button>
      </nav>
    </template>
    <div v-if="STATIC_MODE" class="contact-links" v-reveal>
      <RouterLink to="/articles"
        ><AppIcon name="book" :size="23" />
        <div>
          <strong>读一篇植物手记</strong><span>在故事里，发现更多校园草木</span>
        </div>
        <AppIcon name="arrow" /></RouterLink
      ><RouterLink to="/"
        ><AppIcon name="map" :size="23" />
        <div>
          <strong>去地图上走走</strong><span>把一个名字，落在具体的地方</span>
        </div>
        <AppIcon name="arrow"
      /></RouterLink>
    </div>
  </section>
</template>
<style scoped>
.contact-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.8fr);
  gap: 22px;
  align-items: stretch;
}
.contact-copy {
  position: relative;
  padding: 30px 42px;
  border: 1px solid var(--line-strong);
  border-radius: 25px;
  background: var(--surface);
  box-shadow: 0 6px 0 var(--card-shadow);
}
.postcard-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}
.postcard-top > .eyebrow {
  padding-top: 12px;
  font-size: 10px;
}
.leaf-stamp {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 9px 12px;
  background: var(--leaf-tint);
  outline: 1px dashed var(--line-strong);
  outline-offset: -5px;
  border: 1px solid var(--line-strong);
  transform: rotate(8deg);
  color: var(--primary);
}
.leaf-stamp small {
  font:
    8px Georgia,
    serif;
  letter-spacing: 0.2em;
}
.contact-copy h2 {
  font-size: clamp(30px, 3.2vw, 43px);
  line-height: 1.4;
  margin: 4px 0 18px;
  letter-spacing: -0.03em;
}
.contact-copy h2 span {
  color: var(--primary);
}
.contact-copy > p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
}
.contact-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 25px;
  flex-wrap: wrap;
}
.contact-actions .button {
  font-size: 13px;
}
.copy-email {
  border: 0;
  background: transparent;
  padding: 8px 0;
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 5px;
}
.contact-address {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 15px;
  color: var(--muted);
  font-size: 12px;
}
.email-address {
  user-select: all;
}
.contact-address [role="status"] {
  color: var(--primary);
}
.letter-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 20px;
  margin-top: 26px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--muted);
}
.contact-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--feature-bg);
  color: white;
  border-radius: 25px;
  margin: 0;
  padding: 30px 24px;
  box-shadow: 0 6px 0 var(--card-shadow);
}
.contact-qr > .eyebrow {
  color: #c4dfcd;
  margin-bottom: 22px;
  font-size: 10px;
}
.qr-frame {
  padding: 12px;
  border-radius: 16px;
  background: var(--surface);
  transform: rotate(-3deg);
  transition: transform 0.3s;
  box-shadow: 0 6px 18px #16332640;
}
.qr-frame:hover {
  transform: rotate(0deg) scale(1.03);
}
.qr-frame img {
  display: block;
  width: 170px;
  height: 170px;
  object-fit: contain;
}
.contact-qr figcaption {
  display: flex;
  flex-direction: column;
  text-align: center;
  gap: 10px;
  margin-top: 23px;
}
.contact-qr strong {
  font-size: 24px;
  letter-spacing: 0.15em;
}
.contact-qr figcaption span {
  color: #d1e2d6;
  font-size: 12px;
  line-height: 1.8;
}
.contact-note {
  font-size: 10px;
  color: #bdd2c4;
  margin: 22px 0 0;
}
.contact-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
  margin-top: 28px;
}
.contact-links > a {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 28px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  transition:
    translate 0.2s,
    background 0.2s;
}
.contact-links > a:hover {
  translate: 0 -3px;
  background: var(--soft);
}
.contact-links > a > div {
  flex: 1;
}
.contact-links strong {
  display: block;
  font-size: 18px;
  margin-bottom: 6px;
}
.contact-links span {
  font-size: 12px;
  color: var(--muted);
}
.bbs-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 35px;
}
.post-form {
  padding: 30px;
}
.post-form h2 {
  font-size: 25px;
}
.post-form label,
.reply-details label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 18px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.faces {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border: 0;
  padding: 0;
  margin: 5px 0 8px;
}
.faces legend {
  font-size: 12px;
  margin-bottom: 10px;
}
.faces label {
  display: flex;
  flex-direction: row;
  position: relative;
  margin: 0;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 8px;
}
.faces label.selected {
  border-color: var(--primary);
  background: var(--soft);
}
.faces input {
  width: 12px;
  min-height: 12px;
  accent-color: var(--primary);
}
.faces img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
}
.avatar-note {
  font-size: 10px;
  color: var(--muted);
  display: block;
  margin: 10px 0 20px;
}
.submit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.submit-row > span {
  font-size: 11px;
  color: var(--muted);
}
.bbs-intro {
  padding: 30px;
  background: var(--soft);
  align-self: start;
  border-radius: 8px;
}
.bbs-intro > svg {
  color: var(--primary);
  margin-bottom: 20px;
}
.bbs-intro h2 {
  font-size: 27px;
  line-height: 1.6;
}
.bbs-intro p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.9;
}
.post-card {
  padding: 28px;
  margin-bottom: 18px;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.post-author img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
}
.post-author strong {
  font-size: 12px;
}
.post-author time {
  display: block;
  font-size: 10px;
  color: var(--muted);
}
.post-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.reply-list {
  border-left: 2px solid var(--line);
  padding: 0 0 0 18px;
  margin: 20px 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.reply-details summary {
  cursor: pointer;
  color: var(--primary);
  font-size: 12px;
}
.reply-details form {
  margin-top: 18px;
  max-width: 650px;
}
.bbs-pager {
  display: flex;
  justify-content: center;
  gap: 18px;
  align-items: center;
  margin-top: 24px;
}
.notice,
.error-state {
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .contact-copy {
    padding: 28px;
  }
  .contact-layout {
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 18px;
  }
  .contact-copy h2 {
    font-size: 32px;
  }
  .qr-frame img {
    width: 170px;
    height: 170px;
  }
  .bbs-layout {
    grid-template-columns: 1fr;
  }
  .bbs-intro {
    display: none;
  }
}
@media (max-width: 650px) {
  .contact-layout {
    grid-template-columns: 1fr;
  }
  .contact-copy {
    padding: 24px;
  }
  .contact-copy h2 {
    font-size: 31px;
    margin-top: 16px;
  }
  .postcard-top > .eyebrow {
    max-width: 180px;
    line-height: 1.8;
  }
  .letter-tips {
    align-items: flex-start;
    line-height: 1.8;
  }
  .contact-qr {
    padding: 32px;
  }
  .contact-links {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .contact-links > a {
    padding: 22px;
  }
  .contact-links strong {
    font-size: 19px;
  }
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .post-form {
    padding: 20px;
  }
  .post-card {
    padding: 20px;
  }
}
</style>
