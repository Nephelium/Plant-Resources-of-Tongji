<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../api";
import { ASSET_BASE, STATIC_MODE } from "../env";
import type { AdminSummary, BbsPost, BbsSettings, SiteProfile } from "../types";

const ADMIN_TOKEN_KEY = "tongjiplants_admin_token";
const authForm = ref({ username: "tongjiplants@163.com", password: "" });
const adminToken = ref("");
const isAuthed = ref(false);

const summary = ref<AdminSummary | null>(null);
const posts = ref<BbsPost[]>([]);
const loading = ref(false);
const notice = ref("");
const authError = ref("");
const postFilter = ref<"all" | "pending" | "approved" | "rejected">("all");
const wechatUrl = ref("");
const importing = ref(false);
const qrcodeImage = `${ASSET_BASE}legacy/images/qrcode.jpg`;
const staticNotice = "当前为静态展示站，后台管理功能不可用，请联系公众号或邮箱。";
const bbsSettings = ref<BbsSettings>({
  pageSize: 5,
  requireAudit: true,
  sanitizeHtml: true,
});
const profile = ref<SiteProfile>({
  title: "",
  slogan: "",
  org: "",
  address: "",
  email: "",
  beian: "",
  beianUrl: "",
});

const filteredPosts = computed(() => {
  if (postFilter.value === "all") {
    return posts.value;
  }
  return posts.value.filter((item) => (item.audit ?? "approved") === postFilter.value);
});

const loadData = async () => {
  if (!adminToken.value) {
    return;
  }
  loading.value = true;
  try {
    const [s, p, siteProfile, settings] = await Promise.all([
      api.getAdminSummary(adminToken.value),
      api.getAdminPosts(adminToken.value),
      api.getSiteProfile(),
      api.getBbsSettings(),
    ]);
    summary.value = s;
    posts.value = p;
    profile.value = siteProfile;
    bbsSettings.value = settings;
  } finally {
    loading.value = false;
  }
};

const login = async () => {
  authError.value = "";
  try {
    const result = await api.adminLogin(authForm.value);
    adminToken.value = result.token;
    isAuthed.value = true;
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    await loadData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    authError.value =
      message.includes("401") || message.includes("400")
        ? "账号或密码错误，请重试。"
        : "后台服务未启动或网络异常，请先启动 backend 服务。";
  }
};

const logout = () => {
  adminToken.value = "";
  isAuthed.value = false;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  authForm.value = { username: "tongjiplants@163.com", password: "" };
  summary.value = null;
  posts.value = [];
  notice.value = "";
};

const updatePost = async (postId: number, action: "hide" | "show" | "delete" | "approve" | "reject") => {
  const actionText =
    action === "hide"
      ? "隐藏"
      : action === "show"
        ? "显示"
        : action === "delete"
          ? "删除"
          : action === "approve"
            ? "通过审核"
            : "拒绝审核";
  if (!window.confirm(`确认要${actionText}帖子 #${postId} 吗？`)) {
    return;
  }
  await api.updateAdminPost(adminToken.value, postId, action);
  notice.value = `操作成功：已${actionText}帖子 #${postId}`;
  await loadData();
};

const saveProfile = async () => {
  await api.updateSiteProfile(adminToken.value, profile.value);
  notice.value = "站点资料保存成功";
  await loadData();
};

const saveBbsSettings = async () => {
  await api.updateAdminBbsSettings(adminToken.value, bbsSettings.value);
  notice.value = "留言板设置保存成功";
  await loadData();
};

const importFromWechat = async () => {
  if (!wechatUrl.value.trim()) {
    notice.value = "请先输入公众号文章链接。";
    return;
  }
  importing.value = true;
  try {
    const result = await api.importWechatArticle(adminToken.value, wechatUrl.value.trim());
    notice.value = `导入成功：${result.title}`;
    wechatUrl.value = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    notice.value = message || "导入失败，请检查链接或稍后再试。";
  } finally {
    importing.value = false;
  }
};

onMounted(async () => {
  const cached = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!cached) {
    return;
  }
  adminToken.value = cached;
  isAuthed.value = true;
  try {
    await loadData();
  } catch {
    logout();
  }
});
</script>

<template>
  <section class="section-panel admin-panel">
    <h2>留言板后台管理</h2>

    <section v-if="STATIC_MODE" class="static-card">
      <img :src="qrcodeImage" alt="公众号二维码" />
      <div>
        <h3>静态网站提示</h3>
        <p>{{ staticNotice }}</p>
        <p>邮箱：tongjiplants@163.com</p>
      </div>
    </section>

    <div v-else-if="!isAuthed" class="login-card">
      <h3>管理员登录</h3>
      <input v-model="authForm.username" placeholder="管理员账号" />
      <input v-model="authForm.password" type="password" placeholder="管理员密码" @keyup.enter="login" />
      <button @click="login">登录后台</button>
      <div v-if="authError" class="error">{{ authError }}</div>
    </div>

    <template v-else>
      <div class="toolbar">
        <button @click="loadData">刷新数据</button>
        <button class="ghost" @click="logout">退出登录</button>
        <select v-model="postFilter">
          <option value="all">全部留言</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      <div v-if="summary" class="summary">
        总帖数：{{ summary.totalPosts }} ｜ 待审：{{ summary.pendingPosts ?? 0 }} ｜ 可见：{{ summary.visiblePosts }} ｜ 隐藏：{{ summary.hiddenPosts }}
      </div>
      <div v-if="notice" class="notice">{{ notice }}</div>
      <div v-if="loading">加载中...</div>

      <section class="profile-form">
        <h3>留言板设置</h3>
        <div class="profile-grid settings-grid">
          <div class="setting-item">
            <span>每页留言条数</span>
            <input v-model.number="bbsSettings.pageSize" type="number" min="1" max="30" />
          </div>
          <div class="switch-row">
            <label class="switch"><input v-model="bbsSettings.requireAudit" type="checkbox" /> 新留言需审核后展示</label>
            <label class="switch"><input v-model="bbsSettings.sanitizeHtml" type="checkbox" /> 自动过滤 HTML 标签</label>
          </div>
        </div>
        <button @click="saveBbsSettings">保存留言板设置</button>
      </section>

      <section class="profile-form">
        <h3>站点资料管理</h3>
        <div class="profile-grid">
          <input v-model="profile.title" placeholder="站点标题" />
          <input v-model="profile.slogan" placeholder="站点口号" />
          <input v-model="profile.org" placeholder="组织名称" />
          <input v-model="profile.address" placeholder="地址" />
          <input v-model="profile.email" placeholder="邮箱" />
          <input v-model="profile.beian" placeholder="备案号" />
          <input v-model="profile.beianUrl" placeholder="备案链接" />
        </div>
        <button @click="saveProfile">保存站点资料</button>
      </section>

      <section class="profile-form">
        <h3>公众号文章导入</h3>
        <div class="import-row">
          <input
            v-model="wechatUrl"
            placeholder="粘贴公众号文章链接（https://mp.weixin.qq.com/s?...）"
            class="url-input"
          />
          <button :disabled="importing" @click="importFromWechat">{{ importing ? "导入中..." : "一键导入文章" }}</button>
        </div>
        <p class="hint">导入后会自动生成到文章精选，可继续编辑 Markdown 微调内容。</p>
      </section>

      <section class="post-list">
        <h3>留言管理</h3>
        <article v-for="post in filteredPosts" :key="post.id" class="post-card">
          <h3>#{{ post.id }} {{ post.title }} <small>({{ post.status ?? "visible" }} / {{ post.audit ?? "approved" }})</small></h3>
          <div>{{ post.author }} ｜ {{ new Date(post.createdAt).toLocaleString() }}</div>
          <div class="meta">{{ post.email }} ｜ {{ post.ip || "无IP" }}</div>
          <p>{{ post.content }}</p>
          <div class="actions">
            <button @click="updatePost(post.id, 'approve')">通过</button>
            <button @click="updatePost(post.id, 'reject')">拒绝</button>
            <button @click="updatePost(post.id, 'show')">显示</button>
            <button @click="updatePost(post.id, 'hide')">隐藏</button>
            <button class="danger" @click="updatePost(post.id, 'delete')">删除</button>
          </div>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped>
.admin-panel {
  padding: 24px;
}

.static-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(117, 188, 173, 0.45);
  background: rgba(255, 255, 255, 0.72);
}

.static-card img {
  width: 110px;
  height: 110px;
  border-radius: 10px;
}

.static-card h3 {
  margin: 0 0 6px;
  font-size: 22px;
}

.static-card p {
  margin: 4px 0;
}

.login-card {
  display: grid;
  gap: 10px;
  width: min(420px, 100%);
  padding: 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(132, 183, 168, 0.35);
}

.error {
  color: #be5f5f;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

input {
  width: 360px;
  max-width: 100%;
  height: 34px;
  padding: 0 10px;
}

input:not([type="checkbox"]) {
  width: 360px;
  max-width: 100%;
  height: 36px;
}

select {
  width: 130px;
  height: 34px;
  padding: 0 8px;
}

button {
  width: auto;
  min-width: 104px;
  padding: 0 16px;
  height: 34px;
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.ghost {
  background: rgba(45, 116, 106, 0.7);
}

.summary {
  margin-bottom: 10px;
}

.notice {
  margin-bottom: 10px;
  color: #2f7e73;
}

.profile-form {
  margin: 14px 0;
  padding: 14px;
  border: 1px solid rgba(132, 183, 168, 0.32);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
}

.import-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
}

.url-input {
  width: 100%;
}

.hint {
  margin: 10px 0 0;
  color: #5f847c;
  font-size: 13px;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.settings-grid {
  grid-template-columns: minmax(220px, 380px) 1fr;
  align-items: end;
  gap: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 36px;
}

.setting-item {
  display: grid;
  gap: 6px;
}

.setting-item span {
  font-size: 15px;
  color: #4f756d;
}

.switch {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  color: #315d55;
}

.switch input[type="checkbox"] {
  width: 16px;
  height: 16px;
  min-width: 16px;
  margin: 0;
  accent-color: #2f7e73;
}

.profile-form h3 {
  margin: 0 0 10px;
  font-size: 26px;
}

.post-list {
  margin-top: 18px;
}

.post-card {
  padding: 12px 0;
  border-top: 1px solid rgba(132, 183, 168, 0.3);
}

.meta {
  color: #5a7e76;
  font-size: 13px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.danger {
  background: #d86d6d;
}

@media (max-width: 640px) {
  .admin-panel {
    padding: 14px;
  }

  .static-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .static-card img {
    width: 92px;
    height: 92px;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .profile-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .import-row {
    grid-template-columns: 1fr;
  }
}
</style>
