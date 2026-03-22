<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../api";
import type { BbsPost, BbsSettings } from "../types";

const posts = ref<BbsPost[]>([]);
const loading = ref(false);
const page = ref(1);
const postForm = reactive({
  author: "",
  email: "",
  face: 1,
  title: "",
  content: "",
});
const replyForm = reactive<Record<number, { author: string; content: string }>>({});
const settings = ref<BbsSettings>({
  pageSize: 5,
  requireAudit: true,
  sanitizeHtml: true,
});
const submitNotice = ref("");

const pagedPosts = computed(() => {
  const size = settings.value.pageSize || 5;
  const start = (page.value - 1) * size;
  return posts.value.slice(start, start + size);
});

const totalPages = computed(() => Math.max(1, Math.ceil(posts.value.length / (settings.value.pageSize || 5))));

const loadPosts = async () => {
  loading.value = true;
  try {
    const [postList, bbsSettings] = await Promise.all([api.getBbsPosts(), api.getBbsSettings()]);
    posts.value = postList;
    settings.value = bbsSettings;
    if (page.value > totalPages.value) {
      page.value = totalPages.value;
    }
  } finally {
    loading.value = false;
  }
};

const submitPost = async () => {
  await api.createPost(postForm);
  postForm.author = "";
  postForm.email = "";
  postForm.face = 1;
  postForm.title = "";
  postForm.content = "";
  submitNotice.value = settings.value.requireAudit ? "留言已提交，等待管理员审核后显示。" : "留言发布成功。";
  await loadPosts();
  page.value = 1;
};

const submitReply = async (postId: number) => {
  const payload = replyForm[postId];
  if (!payload) {
    return;
  }
  await api.createReply(postId, payload);
  replyForm[postId] = { author: "", content: "" };
  await loadPosts();
};

const getReply = (postId: number) => {
  if (!replyForm[postId]) {
    replyForm[postId] = { author: "", content: "" };
  }
  return replyForm[postId];
};

onMounted(loadPosts);
</script>

<template>
  <section class="section-panel bbs-panel">
    <div class="bbs-head">
      <h2>留言板</h2>
      <RouterLink to="/admin">进入管理</RouterLink>
    </div>
    <p v-if="submitNotice" class="notice">{{ submitNotice }}</p>
    <div class="editor">
      <input v-model="postForm.author" placeholder="昵称*" />
      <input v-model="postForm.email" placeholder="邮箱*" />
      <div class="faces">
        <label v-for="face in [1, 2, 3, 4, 5, 6, 7]" :key="face">
          <input v-model="postForm.face" type="radio" :value="face" />
          <img :src="`/legacy/bbs/face/face${face}.gif`" :alt="`face-${face}`" />
        </label>
      </div>
      <p class="avatar-note">头像素材（约八年前创站时期）已获得 @INBing 老师授权啦，这里只用于本网站留言互动~</p>
      <input v-model="postForm.title" placeholder="留言标题*" />
      <textarea v-model="postForm.content" rows="5" placeholder="留言内容*"></textarea>
      <button @click="submitPost">发布留言</button>
    </div>

    <div v-if="loading">加载中...</div>
    <article v-for="post in pagedPosts" :key="post.id" class="post-card">
      <div class="post-layout">
        <div class="avatar">
          <img :src="`/legacy/bbs/face/face${post.face ?? 1}.gif`" :alt="post.author" />
          <div>{{ post.author }}</div>
        </div>
        <div class="body">
          <h3>{{ post.title }}</h3>
          <div class="meta">时间：{{ new Date(post.createdAt).toLocaleString() }}</div>
          <p>{{ post.content }}</p>
          <div class="meta-links">
            <a :href="`mailto:${post.email}`">邮箱</a>
          </div>
        </div>
      </div>
      <div class="reply-list">
        <div v-for="reply in post.replies" :key="reply.id" class="reply-item">
          {{ reply.author }}：{{ reply.content }}
        </div>
      </div>
      <div class="reply-editor">
        <input v-model="getReply(post.id).author" placeholder="回复人" />
        <input v-model="getReply(post.id).content" placeholder="回复内容" />
        <button @click="submitReply(post.id)">回复</button>
      </div>
    </article>
    <div class="pager">
      <button :disabled="page <= 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">下一页</button>
    </div>
  </section>
</template>

<style scoped>
.bbs-panel {
  padding: 24px;
}

.notice {
  color: #2f7e73;
  font-weight: 700;
}

.bbs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bbs-head a {
  color: #2e7f74;
}

.editor,
.reply-editor {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.58);
  border-radius: 12px;
  border: 1px solid rgba(132, 183, 168, 0.28);
}

.faces {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.faces label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.faces img {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  box-shadow: 0 6px 12px rgba(44, 95, 84, 0.2);
}

.avatar-note {
  margin: 0;
  color: #6a8c84;
  font-size: 12px;
}

input,
textarea {
  width: 100%;
  padding: 8px;
}

button {
  width: 120px;
  height: 34px;
  background-color: #85cbc0;
  color: white;
  border: none;
  cursor: pointer;
}

.post-card {
  border-top: 1px solid rgba(132, 183, 168, 0.3);
  padding: 14px 0;
}

.post-layout {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 12px;
}

.avatar {
  text-align: center;
  font-size: 13px;
}

.avatar img {
  width: 66px;
  height: 66px;
  border-radius: 10px;
  box-shadow: 0 8px 18px rgba(35, 88, 77, 0.24);
}

.body h3 {
  margin: 0;
}

.meta {
  color: #666;
  font-size: 14px;
}

.meta-links {
  display: flex;
  gap: 12px;
}

.meta-links a {
  color: #2d746a;
}

.reply-list {
  margin: 10px 0;
}

.reply-item {
  background: rgba(255, 255, 255, 0.7);
  margin: 4px 0;
  padding: 8px;
  border-left: 3px solid rgba(117, 188, 173, 0.85);
  border-radius: 8px;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
</style>
