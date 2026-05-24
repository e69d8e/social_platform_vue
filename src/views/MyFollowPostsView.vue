<script setup>
import PostCard from "@/components/PostCard.vue";
import { ref, onMounted, onUnmounted } from "vue";
import { getFollowPostsApi } from "@/api/postApi";
import { ArrowLeft, Loading } from "@element-plus/icons-vue";
import { debounce } from "lodash";

const timestamp = Date.parse(new Date());
const params = ref({ lastId: timestamp, offset: 0 });
const loading = ref(true);
const loadingMore = ref(false);
const noMore = ref(false);
const posts = ref([]);

onMounted(async () => {
  await getPosts();
  loading.value = false;
});

const getPosts = async () => {
  const postList = await getFollowPostsApi(params.value);
  const list = postList.data.data.list;
  posts.value = [...posts.value, ...list];
  params.value.lastId = postList.data.data.minTime;
  params.value.offset = postList.data.data.offset;
  if (list.length === 0) noMore.value = true;
};

const loadMore = async () => {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  try {
    await getPosts();
  } finally {
    loadingMore.value = false;
  }
};

const checkAndLoad = () => {
  if (loadingMore.value || noMore.value) return;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadMore();
  }
};

const handleWindowScroll = debounce(checkAndLoad, 200);

onMounted(() => {
  window.addEventListener("scroll", handleWindowScroll);
});

onUnmounted(() => {
  handleWindowScroll.cancel();
  window.removeEventListener("scroll", handleWindowScroll);
});
</script>

<template>
  <div class="follow-page" v-loading="loading">
    <div class="page-header">
      <div class="back" @click="$router.back()">
        <el-icon size="18"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <span class="page-title">我的关注</span>
    </div>

    <el-empty v-if="posts.length === 0 && !loading" description="关注的人还没有发帖" />

    <el-row v-else :gutter="16" class="result-grid">
      <el-col v-for="post in posts" :key="post.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
        <PostCard :id="post.id" :img-url="post.imgUrl" :title="post.title" :cover="post.cover" :content="post.content" :like-count="post.likeCount" :liked="post.liked" :time="post.createTime" :view-count="post.viewCount" />
      </el-col>
    </el-row>

    <div class="load-status">
      <div v-if="loadingMore" class="loading-more">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="noMore && posts.length > 0" class="no-more">
        <span>— 已经到底了 —</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.follow-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 4px 16px;
    .back {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: var(--el-text-color-regular, #606266);
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
      &:hover {
        color: var(--el-color-primary, #409eff);
        background: var(--el-color-primary-light-9, #ecf5ff);
      }
    }
    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary, #303133);
    }
  }

  .result-grid {
    margin-left: 0 !important;
    margin-right: 0 !important;
    :deep(.el-col) { margin-bottom: 16px; }
  }

  .load-status {
    display: flex;
    justify-content: center;
    padding: 16px 0 32px;
    .loading-more {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--el-text-color-secondary, #909399);
      font-size: 14px;
      .loading-icon { animation: spin 1s linear infinite; }
    }
    .no-more {
      color: var(--el-text-color-placeholder, #c0c4cc);
      font-size: 13px;
      letter-spacing: 2px;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
