<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  searchPostsApi,
  getSearchHistoryApi,
  deleteSearchHistoryApi,
  clearSearchHistoryApi,
} from "@/api/searchApi";
import { searchUsersApi } from "@/api/userApi";
import PostCard from "@/components/PostCard.vue";
import UserCard from "@/components/UserCard.vue";
import { ArrowLeft, Close, Delete, Search } from "@element-plus/icons-vue";
// import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();
const pageNum = ref(1);
const postPageSize = ref(8);
const userPageSize = ref(12);
const loading = ref(true);
const activeName = ref("1");

const searchQuery = computed(() => route.query.keyword || "");

const posts = ref([]);
const users = ref([]);
const postTotal = ref(0);
const usersTotal = ref(0);

const historyList = ref([]);
const historyLoading = ref(false);

const fetchHistory = async () => {
  historyLoading.value = true;
  try {
    const res = await getSearchHistoryApi({ pageNum: 1, pageSize: 20 });
    historyList.value = res.data.data || [];
  } catch {
    // silently fail
  } finally {
    historyLoading.value = false;
  }
};

const deleteHistory = async (id) => {
  try {
    await deleteSearchHistoryApi(id);
    historyList.value = historyList.value.filter((h) => h.id !== id);
  } catch {
    ElMessage.error("删除失败");
  }
};

const clearHistory = async () => {
  try {
    await clearSearchHistoryApi();
    historyList.value = [];
    ElMessage.success("已清空搜索历史");
  } catch {
    ElMessage.error("清空失败");
  }
};

const historyClick = (item) => {
  if (
    searchQuery.value === item.keyword &&
    activeName.value === String(item.type + 1)
  )
    return;
  router.push({
    path: "/search",
    query: { keyword: item.keyword, type: item.type },
  });
};

const fetchData = async () => {
  loading.value = true;
  const keyword = searchQuery.value;
  if (!keyword) {
    loading.value = false;
    return;
  }
  await Promise.all([searchPosts(keyword), searchUsers(keyword)]);
  loading.value = false;
};

const syncTabFromQuery = () => {
  const t = route.query.type;
  if (t !== undefined) {
    activeName.value = String(Number(t) + 1);
  }
};

onMounted(() => {
  syncTabFromQuery();
  fetchData();
  fetchHistory();
});

const searchPosts = async (keyword) => {
  if (activeName.value !== "1") return;
  try {
    const res = await searchPostsApi({
      pageNum: pageNum.value,
      pageSize: postPageSize.value,
      keyword,
    });
    posts.value = res.data.data || [];
    postTotal.value = res.data.total || 0;
  } catch {
    ElMessage.error("搜索帖子失败");
  }
};

const searchUsers = async (keyword) => {
  if (activeName.value !== "2") return;
  try {
    const res = await searchUsersApi({
      pageNum: pageNum.value,
      pageSize: userPageSize.value,
      keyword,
    });
    users.value = res.data.data || [];
    usersTotal.value = res.data.total || 0;
  } catch {
    ElMessage.error("搜索用户失败");
  }
};

const pageChange = async (newPageNum) => {
  pageNum.value = newPageNum;
  if (activeName.value === "1") {
    await searchPosts(searchQuery.value);
  } else {
    await searchUsers(searchQuery.value);
  }
};

const handleTabChange = (name) => {
  activeName.value = name;
  pageNum.value = 1;
};

watch(
  () => route.query.keyword,
  () => {
    pageNum.value = 1;
    posts.value = [];
    users.value = [];
    postTotal.value = 0;
    usersTotal.value = 0;
    syncTabFromQuery();
    fetchData();
    fetchHistory();
  },
);

watch(activeName, (name) => {
  pageNum.value = 1;
  if (name === "1") {
    searchPosts(searchQuery.value);
  } else {
    searchUsers(searchQuery.value);
  }
});
</script>

<template>
  <div class="search" v-loading="loading">
    <!-- 顶部栏 -->
    <div class="search-top">
      <div class="back" @click="$router.back()">
        <el-icon size="20"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <div class="search-info" v-if="searchQuery">
        <span class="keyword">"{{ searchQuery }}"</span>
        <span class="divider">|</span>
        <span v-if="activeName === '1'">找到 {{ postTotal }} 条帖子</span>
        <span v-else>找到 {{ usersTotal }} 位用户</span>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div
      v-if="historyList.length"
      class="search-history"
      v-loading="historyLoading"
    >
      <div class="history-header">
        <span class="history-title">搜索历史</span>
        <el-button type="danger" size="small" text @click="clearHistory">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
      <div class="history-tags">
        <span
          v-for="item in historyList"
          :key="item.id"
          class="history-tag"
          @click="historyClick(item)"
        >
          <el-icon><Search /></el-icon>
          <span class="tag-keyword">{{ item.keyword }}</span>
          <span class="tag-type">{{ item.type === 0 ? "帖子" : "用户" }}</span>
          <el-icon class="tag-close" @click.stop="deleteHistory(item.id)"
            ><Close
          /></el-icon>
        </span>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs
      v-model="activeName"
      class="search-tabs"
      @tab-change="handleTabChange"
    >
      <el-tab-pane name="1">
        <template #label>
          <span class="tab-label">
            <span>帖子</span>
            <span v-if="postTotal" class="tab-count">{{ postTotal }}</span>
          </span>
        </template>

        <div v-if="posts.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无相关帖子" />
        </div>

        <el-row v-else :gutter="16" class="result-grid">
          <el-col
            v-for="post in posts"
            :key="post.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <PostCard
              :id="post.id"
              :img-url="post.imgUrl"
              :title="post.title"
              :content="post.content"
              :cover="post.cover"
              :liked="post.liked"
              :like-count="post.likeCount"
              :time="post.createTime"
              :view-count="post.viewCount"
            />
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane name="2">
        <template #label>
          <span class="tab-label">
            <span>用户</span>
            <span v-if="usersTotal" class="tab-count">{{ usersTotal }}</span>
          </span>
        </template>

        <div v-if="users.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无相关用户" />
        </div>

        <el-row v-else :gutter="16" class="result-grid">
          <el-col
            v-for="user in users"
            :key="user.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
            :xl="4"
          >
            <UserCard
              :id="user.id"
              :avatar="user.avatar"
              :nickname="user.nickname"
              :bio="user.bio"
              :followed="user.followed"
              :count="user.count"
            />
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <!-- 分页 -->
    <div
      v-if="(activeName === '1' ? postTotal : usersTotal) > 0"
      class="pagination"
    >
      <el-pagination
        @current-change="pageChange"
        :total="activeName === '1' ? postTotal : usersTotal"
        :default-page-size="activeName === '1' ? postPageSize : userPageSize"
        background
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 12px 40px;

  .search-top {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);

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

    .search-info {
      font-size: 14px;
      color: var(--el-text-color-secondary, #909399);

      .keyword {
        color: var(--el-color-primary, #409eff);
        font-weight: 600;
      }

      .divider {
        margin: 0 8px;
        color: var(--el-border-color, #dcdfe6);
      }
    }
  }

  .search-history {
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--el-bg-color, #ffffff);
    border-radius: 12px;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;

      .history-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary, #303133);
      }
    }

    .history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .history-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 13px;
      color: var(--el-text-color-regular, #606266);
      background: var(--el-bg-color-page, #f2f3f5);
      border-radius: 16px;
      cursor: pointer;
      transition:
        background 0.2s,
        color 0.2s;

      &:hover {
        background: var(--el-color-primary-light-9, #ecf5ff);
        color: var(--el-color-primary, #409eff);
      }

      .tag-keyword {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tag-type {
        font-size: 11px;
        color: var(--el-text-color-placeholder, #a8abb2);
      }

      .tag-close {
        font-size: 12px;
        margin-left: 2px;
        color: var(--el-text-color-placeholder, #a8abb2);

        &:hover {
          color: var(--el-color-danger, #f56c6c);
        }
      }
    }
  }

  .search-tabs {
    margin-top: 8px;

    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 10px;
      font-size: 12px;
      background: var(--el-color-primary-light-9, #ecf5ff);
      color: var(--el-color-primary, #409eff);
    }
  }

  .result-grid {
    margin-left: 0 !important;
    margin-right: 0 !important;

    :deep(.el-col) {
      margin-bottom: 16px;
    }
  }

  .empty-state {
    padding: 60px 0;
  }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 24px 0 8px;
  }
}
</style>
