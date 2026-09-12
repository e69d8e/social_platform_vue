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
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import BackButton from "@/components/BackButton.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import { Close, Delete, Search } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
// import { ElMessage } from "element-plus";

const userStore = useUserStore();
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
  if (!userStore.userInfo?.username) return;
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
    postTotal.value = Number(res.data.total || 0);
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
    usersTotal.value = Number(res.data.total || 0);
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
      <BackButton :size="20" />
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

        <SkeletonGrid v-if="loading && posts.length === 0" :count="8" />

        <div v-else-if="posts.length === 0" class="empty-state">
          <el-empty description="暂无相关帖子" />
        </div>

        <CardGrid v-else :items="posts">
          <template #item="{ item, index }">
            <PostCard
              :id="item.id"
              :user-id="item.userId"
              :username="item.username"
              :title="item.title"
              :content="item.content"
              :cover="item.cover"
              :liked="item.liked"
              :like-count="item.likeCount"
              :time="item.createTime"
              :view-count="item.viewCount"
              :delay="index < 12 ? index * 40 : 0"
            />
          </template>
        </CardGrid>
      </el-tab-pane>

      <el-tab-pane name="2">
        <template #label>
          <span class="tab-label">
            <span>用户</span>
            <span v-if="usersTotal" class="tab-count">{{ usersTotal }}</span>
          </span>
        </template>

        <SkeletonGrid
          v-if="loading && users.length === 0"
          type="user"
          :count="12"
        />

        <div v-else-if="users.length === 0" class="empty-state">
          <el-empty description="暂无相关用户" />
        </div>

        <CardGrid v-else :items="users">
          <template #item="{ item, index }">
            <UserCard
              :id="item.id"
              :avatar="item.avatar"
              :nickname="item.nickname"
              :bio="item.bio"
              :followed="item.followed"
              :count="item.count"
              :delay="index < 12 ? index * 40 : 0"
            />
          </template>
        </CardGrid>
      </el-tab-pane>
    </el-tabs>

    <!-- 分页 -->
    <ListPagination
      v-model:page-num="pageNum"
      :total="activeName === '1' ? postTotal : usersTotal"
      :page-size="activeName === '1' ? postPageSize : userPageSize"
      show-when="zero"
      @change="pageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.search {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .search-top {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border-light);

    .search-info {
      font-size: 14px;
      color: var(--text-secondary);

      .keyword {
        color: var(--el-color-primary);
        font-weight: 600;
      }

      .divider {
        margin: 0 8px;
        color: var(--border-default);
      }
    }
  }

  .search-history {
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--bg-card);
    border-radius: $radius-lg;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-light);

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;

      .history-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
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
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border-radius: $radius-full;
      cursor: pointer;
      transition: all $transition-base;

      &:hover {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }

      .tag-keyword {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tag-type {
        font-size: 11px;
        color: var(--text-placeholder);
      }

      .tag-close {
        font-size: 12px;
        margin-left: 2px;
        color: var(--text-placeholder);
        transition: color $transition-fast;

        &:hover {
          color: var(--el-color-danger);
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
      border-radius: $radius-full;
      font-size: 12px;
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  .empty-state {
    padding: 60px 0;
  }
}

@media (max-width: 640px) {
  .search {
    padding: 10px 8px 36px;

    .search-top {
      gap: 8px;
      margin-bottom: 12px;

      .search-info {
        font-size: 13px;

        .keyword {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .search-history {
      padding: 10px 12px;
      margin-bottom: 12px;
      border-radius: var(--radius-md);

      .history-tag {
        font-size: 12px;
        padding: 3px 8px;
      }
    }

    .search-tabs .tab-label {
      font-size: 14px;
    }
  }
}
</style>
