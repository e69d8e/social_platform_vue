<template>
  <div class="featured-page">
    <PageHeader title="每周精选" />

    <div v-if="loading && posts.length === 0" class="loading-wrap">
      <el-skeleton :rows="6" animated />
    </div>

    <el-empty v-else-if="isError" description="精选内容加载失败">
      <el-button type="primary" @click="fetchPosts(true)">重新加载</el-button>
    </el-empty>

    <el-empty v-else-if="posts.length === 0" description="暂无精选帖子">
      <el-button round @click="$router.push('/home')">去首页逛逛</el-button>
    </el-empty>

    <div v-else class="featured-list">
      <button
        v-for="post in posts"
        :key="post.id"
        type="button"
        class="featured-card"
        @click="$router.push(`/post/${post.id}`)"
      >
        <div v-if="post.cover" class="card-cover">
          <img :src="post.cover" :alt="post.title" loading="lazy" />
        </div>
        <div class="card-content">
          <h3 class="card-title">{{ post.title }}</h3>
          <p class="card-snippet">{{ getSnippet(post.content) }}</p>
          <div class="card-meta">
            <el-avatar :size="24" :src="post.avatar" />
            <span class="author-name">{{ post.nickname }}</span>
            <span class="meta-item">
              <el-icon><StarFilled /></el-icon>
              {{ post.likeCount || 0 }}
            </span>
            <span class="meta-item">
              <el-icon><ChatDotRound /></el-icon>
              {{ post.commentCount || 0 }}
            </span>
            <span class="meta-item">{{
              formatExactTime(post.createTime)
            }}</span>
          </div>
        </div>
        <div class="featured-badge">
          <el-icon><Trophy /></el-icon> 精选
        </div>
      </button>
    </div>

    <div v-if="total > posts.length" class="load-more">
      <el-button :loading="loading" @click="loadMore">加载更多</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import PageHeader from "@/components/PageHeader.vue";
import { getFeaturedPostsApi } from "@/api/postApi";
import { formatExactTime } from "@/utils/formatTime";

const posts = ref([]);
const loading = ref(false);
const isError = ref(false);
const pageNum = ref(1);
const total = ref(0);

const fetchPosts = async (reset = false) => {
  if (reset) {
    pageNum.value = 1;
    posts.value = [];
  }
  loading.value = true;
  isError.value = false;
  try {
    const res = await getFeaturedPostsApi({
      pageNum: pageNum.value,
      pageSize: 10,
    });
    if (res.data.code === 1) {
      const data = res.data.data || [];
      if (reset) {
        posts.value = data;
      } else {
        posts.value.push(...data);
      }
      total.value = Number(res.data.total || 0);
    } else {
      isError.value = true;
    }
  } catch {
    isError.value = true;
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  if (loading.value || posts.value.length >= total.value) return;
  pageNum.value++;
  fetchPosts();
};

const getSnippet = (content) => {
  if (!content) return "";
  const text = content.replace(/<[^>]*>/g, "").trim();
  return text.length > 120 ? text.slice(0, 120) + "…" : text;
};

onMounted(() => fetchPosts(true));
</script>

<style lang="scss" scoped>
.featured-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
}

.loading-wrap {
  padding: 20px 0;
}

.featured-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.featured-card {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  border: 1px solid var(--el-border-color-lighter);
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-cover {
    width: 100%;
    height: 180px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-content {
    padding: 14px 16px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 6px;
    }

    .card-snippet {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin: 0 0 10px;
    }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--el-text-color-regular);

      .author-name {
        flex: 1;
      }

      .meta-item {
        font-size: 12px;
      }
    }
  }

  .featured-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--gradient-primary);
    color: #fff;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }
}

.load-more {
  text-align: center;
  padding: 16px 0;
}
</style>
