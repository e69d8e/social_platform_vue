<script setup>
import { ref, onMounted } from "vue";
import { getBanPostsApi, searchBanPostsApi } from "@/api/reviewerApi";
import PostCard from "@/components/PostCard.vue";
import { ArrowLeft, Search } from "@element-plus/icons-vue";
import { debounce } from "lodash";

const postList = ref([]);
const pageNum = ref(1);
const pageSize = ref(8);
const total = ref(0);
const loading = ref(true);
const keyword = ref("");

const fetchData = async () => {
  const params = { pageNum: pageNum.value, pageSize: pageSize.value };
  const res = keyword.value.trim()
    ? await searchBanPostsApi({ ...params, keyword: keyword.value.trim() })
    : await getBanPostsApi(params);
  postList.value = res.data.data;
  total.value = res.data.total;
};

onMounted(async () => {
  await fetchData();
  loading.value = false;
});

const handleSearch = debounce(async () => {
  pageNum.value = 1;
  loading.value = true;
  await fetchData();
  loading.value = false;
}, 300);

const pageChange = async (newPage) => {
  pageNum.value = newPage;
  loading.value = true;
  await fetchData();
  loading.value = false;
};
</script>

<template>
  <div class="list-page" v-loading="loading">
    <div class="page-header">
      <div class="back" @click="$router.back()">
        <el-icon size="18"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <span class="page-title">已封禁帖子</span>
      <span class="total-count">共 {{ total }} 篇</span>
    </div>

    <div class="search-bar">
      <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索封禁帖子..." clearable @input="handleSearch" @clear="handleSearch" />
    </div>

    <el-empty v-if="postList.length === 0 && !loading" description="暂无封禁帖子" />

    <el-row v-else :gutter="16" class="result-grid">
      <el-col v-for="post in postList" :key="post.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
        <PostCard :id="post.id" :img-url="post.imgUrl" :title="post.title" :content="post.content" :liked="post.liked" :like-count="post.likeCount" :time="post.createTime" :view-count="post.viewCount" />
      </el-col>
    </el-row>

    <div v-if="total > pageSize" class="pagination">
      <el-pagination @current-change="pageChange" :total="total" v-model:current-page="pageNum" :page-size="pageSize" background layout="prev, pager, next" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-page {
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
      color: var(--text-secondary);
      font-size: 14px;
      padding: 4px 8px;
      border-radius: $radius-sm;
      transition: all $transition-base;
      flex-shrink: 0;
      &:hover {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
    }
    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .total-count {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }

  .search-bar {
    padding: 0 4px 16px;
    max-width: 400px;
  }

  .result-grid {
    margin-left: 0 !important;
    margin-right: 0 !important;
    :deep(.el-col) { margin-bottom: 16px; }
  }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
  }
}
</style>
