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
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const pageNum = ref(1);
const postPageSize = ref(8);
const userPageSize = ref(12);
const loading = ref(true);
const tabLoading = ref(false);
const postFetchedPage = ref(1);
const userFetchedPage = ref(1);
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
    await ElMessageBox.confirm(
      "清空后无法恢复，确定清空全部搜索历史吗？",
      "清空搜索历史",
      {
        confirmButtonText: "清空",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return; // 用户取消
  }
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
  // 两个维度同时搜索：另一侧的计数徽标即时可用，切 tab 不用再等
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
  try {
    const res = await searchPostsApi({
      pageNum: pageNum.value,
      pageSize: postPageSize.value,
      keyword,
    });
    posts.value = res.data.data || [];
    postTotal.value = Number(res.data.total || 0);
    postFetchedPage.value = pageNum.value;
  } catch {
    ElMessage.error("搜索帖子失败");
  }
};

const searchUsers = async (keyword) => {
  try {
    const res = await searchUsersApi({
      pageNum: pageNum.value,
      pageSize: userPageSize.value,
      keyword,
    });
    users.value = res.data.data || [];
    usersTotal.value = Number(res.data.total || 0);
    userFetchedPage.value = pageNum.value;
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

const handleTabChange = () => {
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
  // 关键词搜索时两个 tab 的第 1 页已并行拉取过；只有当目标 tab
  // 之前翻过页时才需要回到第 1 页重新拉取，并用轻遮罩过渡
  const isPosts = name === "1";
  const fetchedPage = isPosts ? postFetchedPage.value : userFetchedPage.value;
  if (fetchedPage !== 1) {
    tabLoading.value = true;
    const req = isPosts
      ? searchPosts(searchQuery.value)
      : searchUsers(searchQuery.value);
    req.finally(() => {
      tabLoading.value = false;
    });
  }
});
</script>

<template>
  <div class="search" v-loading="loading && !posts.length && !users.length">
    <!-- 顶部栏 -->
    <div class="search-top">
      <BackButton :size="20" />
      <div class="search-info" v-if="searchQuery">
        <span class="keyword">"{{ searchQuery }}"</span>
        <span v-if="activeName === '1'" class="result-count">
          找到 {{ postTotal }} 条帖子
        </span>
        <span v-else class="result-count">找到 {{ usersTotal }} 位用户</span>
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
          <button
            class="tag-close"
            type="button"
            :aria-label="`删除历史记录 ${item.keyword}`"
            @click.stop="deleteHistory(item.id)"
          >
            <el-icon><Close /></el-icon>
          </button>
        </span>
      </div>
    </div>

    <!-- 标签页 -->
    <el-tabs
      v-model="activeName"
      class="search-tabs"
      v-loading="tabLoading"
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

      .result-count {
        margin-left: 12px;
        padding-left: 12px;
        border-left: 1px solid var(--border-default);
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
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        margin-right: -4px;
        padding: 0;
        border: none;
        background: none;
        border-radius: 50%;
        color: var(--text-placeholder);
        cursor: pointer;
        font-size: 12px;
        transition: all $transition-fast;

        &:hover {
          color: var(--el-color-danger);
          background: var(--el-color-danger-light-9);
        }

        &:focus-visible {
          outline: 2px solid var(--border-focus);
          outline-offset: 1px;
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
