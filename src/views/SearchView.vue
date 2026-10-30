<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { searchPostsApi, searchUsersApi } from "@/api/searchApi";
import PostCard from "@/components/PostCard.vue";
import UserCard from "@/components/UserCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import BackButton from "@/components/BackButton.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import {
  Close,
  Delete,
  Search,
  TrendCharts,
  Document,
  User,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useSearchHistory } from "@/composables/useSearchHistory";
import {
  POST_PAGE_SIZE,
  USER_PAGE_SIZE,
  SEARCH_HISTORY_PAGE_SIZE,
} from "@/constants/pagination";

const route = useRoute();
const router = useRouter();

const postPageSize = POST_PAGE_SIZE;
const userPageSize = USER_PAGE_SIZE;

const localKeyword = ref("");
const searchQuery = computed(() => route.query.keyword || "");
/** 当前维度：'1' 帖子 / '2' 用户 */
const activeName = ref("1");

// ---- 两个维度各自维护分页状态 ----
// 之前共用一个 pageNum，导致「帖子翻到第 3 页 → 切到用户 → 切回来」页码错位。
const posts = ref([]);
const postTotal = ref(0);
const postPage = ref(1);
const postLoading = ref(false);
const postError = ref(false);
const postLoadedPage = ref(0);

const users = ref([]);
const usersTotal = ref(0);
const userPage = ref(1);
const userLoading = ref(false);
const userError = ref(false);
const userLoadedPage = ref(0);

const loading = computed(() => postLoading.value || userLoading.value);
const tabLoading = computed(() =>
  activeName.value === "1" ? postLoading.value : userLoading.value,
);
const HOT_SEARCHES = [
  "黑神话",
  "游戏",
  "摄影",
  "AI",
  "科技",
  "教程",
  "数码",
  "历史",
];

// 搜索历史：拉取/删除/清空逻辑收敛于 useSearchHistory
const {
  historyList,
  historyLoading,
  fetchHistory,
  deleteHistory,
  clearHistory,
} = useSearchHistory({ pageSize: SEARCH_HISTORY_PAGE_SIZE });

const historyClick = (item) => {
  if (searchQuery.value === item.keyword) return;
  router.push({ path: "/search", query: { keyword: item.keyword } });
};

const handlePageSearch = () => {
  const kw = localKeyword.value.trim();
  if (!kw) {
    ElMessage.warning("请输入搜索关键词");
    return;
  }
  if (kw === searchQuery.value) {
    // 关键词没变就没必要重复请求，只保证当前维度是第一页
    resetToFirstPage();
    return;
  }
  router.push({
    path: "/search",
    query: { keyword: kw, type: activeName.value === "2" ? 1 : 0 },
  });
};

const quickSearch = (kw) => {
  localKeyword.value = kw;
  router.push({
    path: "/search",
    query: { keyword: kw, type: activeName.value === "2" ? 1 : 0 },
  });
};

const clearSearch = () => {
  localKeyword.value = "";
  router.push({ path: "/search" });
};

// ---- 数据加载 ----
const fetchPosts = async (page = postPage.value) => {
  const keyword = searchQuery.value;
  if (!keyword) return;
  postLoading.value = true;
  postError.value = false;
  try {
    const res = await searchPostsApi({
      pageNum: page,
      pageSize: postPageSize,
      keyword,
    });
    if (res.data.code !== 1) throw new Error(res.data.message || "搜索失败");
    posts.value = res.data.data || [];
    postTotal.value = Number(res.data.total ?? 0);
    postLoadedPage.value = page;
  } catch {
    // 提示已由拦截器统一给出，这里只标记错误态并提供重试入口
    postError.value = true;
  } finally {
    postLoading.value = false;
  }
};

const fetchUsers = async (page = userPage.value) => {
  const keyword = searchQuery.value;
  if (!keyword) return;
  userLoading.value = true;
  userError.value = false;
  try {
    const res = await searchUsersApi({
      pageNum: page,
      pageSize: userPageSize,
      keyword,
    });
    if (res.data.code !== 1) throw new Error(res.data.message || "搜索失败");
    users.value = res.data.data || [];
    usersTotal.value = Number(res.data.total ?? 0);
    userLoadedPage.value = page;
  } catch {
    userError.value = true;
  } finally {
    userLoading.value = false;
  }
};

/** 首次搜索/关键词变化：两侧同时请求，另一个 tab 的计数徽标即时可用 */
const fetchAll = async () => {
  const keyword = searchQuery.value;
  if (!keyword) {
    posts.value = [];
    users.value = [];
    postTotal.value = 0;
    usersTotal.value = 0;
    postLoadedPage.value = 0;
    userLoadedPage.value = 0;
    return;
  }
  postPage.value = 1;
  userPage.value = 1;
  await Promise.all([fetchPosts(1), fetchUsers(1)]);
};

const resetToFirstPage = () => {
  if (activeName.value === "1") {
    postPage.value = 1;
    fetchPosts(1);
  } else {
    userPage.value = 1;
    fetchUsers(1);
  }
};

const retryActive = () => {
  if (activeName.value === "1") fetchPosts(postPage.value);
  else fetchUsers(userPage.value);
};

const syncTabFromQuery = () => {
  const t = route.query.type;
  if (t === undefined) {
    activeName.value = "1";
    return;
  }
  const parsed = Number(t);
  activeName.value = parsed === 1 ? "2" : "1";
};

const pageChange = (newPageNum) => {
  if (activeName.value === "1") {
    if (newPageNum === postLoadedPage.value) return;
    postPage.value = newPageNum;
    fetchPosts(newPageNum);
  } else {
    if (newPageNum === userLoadedPage.value) return;
    userPage.value = newPageNum;
    fetchUsers(newPageNum);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleTabChange = (name) => {
  activeName.value = name;
  router.replace({
    path: "/search",
    query: {
      ...route.query,
      type: name === "1" ? 0 : 1,
    },
  });
  // 该维度还没加载过（或停留在别的页码）才补一次请求，避免切 tab 时重复打接口
  if (name === "1" && postTotal.value > 0 && postLoadedPage.value === 0) {
    fetchPosts(postPage.value);
  }
  if (name === "2" && usersTotal.value > 0 && userLoadedPage.value === 0) {
    fetchUsers(userPage.value);
  }
};

onMounted(async () => {
  localKeyword.value = searchQuery.value;
  syncTabFromQuery();
  await fetchAll();
  // 搜索历史是「搜索请求」的副作用（服务端在结果返回时才写入），
  // 必须等结果回来再拉，否则刚搜过的关键词不会出现在历史条里
  fetchHistory();
});

watch(
  () => searchQuery.value,
  async () => {
    localKeyword.value = searchQuery.value;
    syncTabFromQuery();
    await fetchAll();
    fetchHistory();
  },
);

watch(
  () => route.query.type,
  () => syncTabFromQuery(),
);

// 页面需要展示的当前维度分页参数
const activePage = computed(() =>
  activeName.value === "1" ? postPage.value : userPage.value,
);
const activeTotal = computed(() =>
  activeName.value === "1" ? postTotal.value : usersTotal.value,
);
const activePageSize = computed(() =>
  activeName.value === "1" ? postPageSize : userPageSize,
);
</script>

<template>
  <div class="search-page-container">
    <!-- 顶部综合搜索面板 -->
    <div class="search-hero">
      <div class="hero-nav">
        <BackButton :size="18" />
        <span class="hero-breadcrumb">探索与搜索</span>
      </div>

      <div class="hero-search-box">
        <div class="search-input-inner">
          <el-icon class="input-icon"><Search /></el-icon>
          <input
            v-model="localKeyword"
            type="text"
            class="hero-native-input"
            placeholder="输入关键词搜索帖子或用户..."
            @keyup.enter="handlePageSearch"
          />
          <button
            v-if="localKeyword"
            type="button"
            class="clear-btn"
            @click="localKeyword = ''"
          >
            <el-icon :size="14"><Close /></el-icon>
          </button>
        </div>
        <button
          class="hero-search-submit"
          type="button"
          @click="handlePageSearch"
        >
          <el-icon><Search /></el-icon>
          <span>搜索</span>
        </button>
      </div>

      <!-- 热门探索标签 -->
      <div class="hero-hot-tags">
        <span class="hot-label">
          <el-icon><TrendCharts /></el-icon>
          热门话题:
        </span>
        <button
          v-for="tag in HOT_SEARCHES"
          :key="tag"
          type="button"
          class="hot-chip"
          :class="{ active: searchQuery === tag }"
          @click="quickSearch(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 搜索历史条 (若存在) -->
    <div
      v-if="historyList.length"
      class="search-history-bar"
      v-loading="historyLoading"
    >
      <div class="history-bar-left">
        <span class="history-title">最近搜索:</span>
        <div class="history-scroll-tags">
          <span
            v-for="item in historyList"
            :key="item.id"
            class="history-tag"
            @click="historyClick(item)"
          >
            <span class="tag-keyword">{{ item.keyword }}</span>
            <button
              class="tag-close"
              type="button"
              :aria-label="`删除 ${item.keyword}`"
              @click.stop="deleteHistory(item.id)"
            >
              <el-icon><Close /></el-icon>
            </button>
          </span>
        </div>
      </div>
      <button class="clear-all-btn" type="button" @click="clearHistory">
        <el-icon :size="13"><Delete /></el-icon>
        清空历史
      </button>
    </div>

    <!-- 结果统计与状态提示 -->
    <div v-if="searchQuery" class="search-summary-bar">
      <div class="summary-text">
        关于
        <strong class="keyword-highlight">“{{ searchQuery }}”</strong>
        的搜索结果
        <span class="summary-count">
          （找到 {{ postTotal }} 篇帖子，{{ usersTotal }} 位用户）
        </span>
      </div>
      <button class="reset-search-btn" type="button" @click="clearSearch">
        清除搜索条件
      </button>
    </div>

    <!-- 空白状态：未输入关键词时的探索指引 -->
    <div v-if="!searchQuery && !loading" class="empty-explore-prompt">
      <div class="prompt-icon">
        <el-icon :size="48"><Search /></el-icon>
      </div>
      <h3>开始探索社区精彩内容</h3>
      <p>输入关键词，或点击上方的热门标签探索最新帖子与创作者</p>
      <div class="prompt-chips">
        <button
          v-for="tag in HOT_SEARCHES"
          :key="tag"
          type="button"
          class="prompt-chip"
          @click="quickSearch(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 搜索结果主体标签页 -->
    <div v-else class="search-content">
      <!-- 维度切换 Tab -->
      <div class="custom-tabs">
        <button
          class="custom-tab-item"
          :class="{ active: activeName === '1' }"
          type="button"
          @click="
            activeName = '1';
            handleTabChange('1');
          "
        >
          <el-icon><Document /></el-icon>
          <span>帖子</span>
          <span class="tab-count-badge">{{ postTotal }}</span>
        </button>
        <button
          class="custom-tab-item"
          :class="{ active: activeName === '2' }"
          type="button"
          @click="
            activeName = '2';
            handleTabChange('2');
          "
        >
          <el-icon><User /></el-icon>
          <span>用户</span>
          <span class="tab-count-badge">{{ usersTotal }}</span>
        </button>
      </div>

      <!-- 帖子内容区 -->
      <div v-if="activeName === '1'" class="tab-content" v-loading="tabLoading">
        <SkeletonGrid
          v-if="loading && posts.length === 0"
          :count="POST_PAGE_SIZE"
        />

        <!-- 请求失败：给出重试入口，而不是伪装成「没有结果」 -->
        <div v-else-if="postError && posts.length === 0" class="no-result-card">
          <el-icon :size="40"><Document /></el-icon>
          <h4>搜索结果加载失败</h4>
          <p>可能是网络波动，点击下方按钮重试</p>
          <el-button type="primary" round @click="retryActive"
            >重新搜索</el-button
          >
        </div>

        <div v-else-if="posts.length === 0" class="no-result-card">
          <div class="no-result-icon">
            <el-icon :size="40"><Document /></el-icon>
          </div>
          <h4>未找到与“{{ searchQuery }}”相关的帖子</h4>
          <p>尝试更换关键词、检查错别字，或探索下方热门推荐</p>
          <div class="suggest-chips">
            <button
              v-for="tag in HOT_SEARCHES.slice(0, 5)"
              :key="tag"
              type="button"
              class="suggest-chip"
              @click="quickSearch(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <CardGrid v-else :items="posts">
          <template #item="{ item, index }">
            <PostCard
              :post="item"
              :keyword="searchQuery"
              :delay="index < 12 ? index * 35 : 0"
            />
          </template>
        </CardGrid>
      </div>

      <!-- 用户内容区 -->
      <div
        v-else-if="activeName === '2'"
        class="tab-content"
        v-loading="tabLoading"
      >
        <SkeletonGrid
          v-if="loading && users.length === 0"
          type="user"
          :count="USER_PAGE_SIZE"
        />

        <div v-else-if="userError && users.length === 0" class="no-result-card">
          <el-icon :size="40"><User /></el-icon>
          <h4>搜索结果加载失败</h4>
          <p>可能是网络波动，点击下方按钮重试</p>
          <el-button type="primary" round @click="retryActive"
            >重新搜索</el-button
          >
        </div>

        <div v-else-if="users.length === 0" class="no-result-card">
          <div class="no-result-icon">
            <el-icon :size="40"><User /></el-icon>
          </div>
          <h4>未找到与“{{ searchQuery }}”相关的用户</h4>
          <p>可以尝试搜索昵称或用户名</p>
        </div>

        <CardGrid v-else :items="users">
          <template #item="{ item, index }">
            <UserCard
              :user="item"
              :keyword="searchQuery"
              :delay="index < 12 ? index * 35 : 0"
            />
          </template>
        </CardGrid>
      </div>

      <!-- 分页组件 -->
      <div v-if="activeTotal > 0" class="pagination-wrap">
        <ListPagination
          :page-num="activePage"
          :total="activeTotal"
          :page-size="activePageSize"
          show-when="zero"
          @change="pageChange"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 50px;
}

// ---- Hero 综合搜索头 ----
.search-hero {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-2xl);
  padding: 24px 28px 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  transition: all var(--transition-base);
}

.hero-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;

  .hero-breadcrumb {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
  }
}

.hero-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 760px;
  margin: 0 auto 16px;
}

.search-input-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-subtle);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-full);
  padding: 8px 16px;
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--el-color-primary-light-7);
    background: var(--bg-card);
  }

  &:focus-within {
    border-color: var(--el-color-primary);
    background: var(--bg-card);
    box-shadow:
      0 0 0 3px var(--el-color-primary-light-9),
      var(--glow-primary);
  }

  .input-icon {
    font-size: 18px;
    color: var(--text-placeholder);
    flex-shrink: 0;
  }

  .hero-native-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    font-family: inherit;
    color: var(--text-ink);

    &::placeholder {
      color: var(--text-placeholder);
      font-size: 14px;
    }
  }

  .clear-btn {
    border: none;
    background: var(--bg-muted);
    color: var(--text-muted);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--border-default);
      color: var(--text-ink);
    }
  }
}

.hero-search-submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--gradient-primary);
  color: #fff;
  font-size: 14.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(204, 109, 78, 0.28);
  transition: all var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--glow-primary);
  }

  &:active {
    transform: translateY(0);
  }
}

.hero-hot-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;

  .hot-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 500;
  }

  .hot-chip {
    padding: 3px 12px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
    background: var(--bg-subtle);
    color: var(--text-body);
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
      transform: translateY(-1px);
    }

    &.active {
      background: var(--el-color-primary);
      color: #fff;
      border-color: var(--el-color-primary);
    }
  }
}

// ---- 搜索历史横条 ----
.search-history-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 10px 18px;
  margin-bottom: 16px;
  font-size: 13px;

  .history-bar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1;
  }

  .history-title {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .history-scroll-tags {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .history-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    color: var(--text-body);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    .tag-close {
      border: none;
      background: none;
      color: var(--text-placeholder);
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      padding: 0;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--el-color-danger);
      }
    }
  }

  .clear-all-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: none;
    color: var(--text-placeholder);
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    transition: color var(--transition-fast);

    &:hover {
      color: var(--el-color-danger);
    }
  }
}

// ---- 结果统计条 ----
.search-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 4px 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-light);

  .summary-text {
    font-size: 14px;
    color: var(--text-secondary);

    .keyword-highlight {
      color: var(--el-color-primary);
      font-weight: 700;
    }

    .summary-count {
      color: var(--text-muted);
      margin-left: 6px;
      font-size: 13px;
    }
  }

  .reset-search-btn {
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 12.5px;
    cursor: pointer;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--el-color-primary);
      text-decoration: underline;
    }
  }
}

// ---- 空白探索引导态 ----
.empty-explore-prompt {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-card);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-xl);
  margin-top: 10px;

  .prompt-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    margin-bottom: 16px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-ink);
  }

  p {
    margin: 0 0 24px;
    font-size: 14px;
    color: var(--text-muted);
  }

  .prompt-chips {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .prompt-chip {
    padding: 6px 16px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-default);
    background: var(--bg-card);
    color: var(--text-body);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
  }
}

// ---- 自定义 Segmented Tab ----
.custom-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  margin-bottom: 20px;
}

.custom-tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    background: var(--el-color-primary);
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(204, 109, 78, 0.3);

    .tab-count-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
    }
  }

  .tab-count-badge {
    padding: 1px 7px;
    border-radius: var(--radius-full);
    font-size: 11.5px;
    background: var(--bg-subtle);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    transition: all var(--transition-fast);
  }
}

// 无结果提示卡
.no-result-card {
  text-align: center;
  padding: 60px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);

  .no-result-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-subtle);
    color: var(--text-placeholder);
    margin-bottom: 16px;
  }

  h4 {
    margin: 0 0 8px;
    font-size: 16px;
    color: var(--text-ink);
  }

  p {
    margin: 0 0 20px;
    font-size: 13.5px;
    color: var(--text-muted);
  }

  .suggest-chips {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .suggest-chip {
    padding: 5px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-light);
    background: var(--bg-subtle);
    color: var(--text-body);
    font-size: 13px;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
    }
  }
}

.pagination-wrap {
  margin-top: 32px;
}

@media (max-width: 768px) {
  .search-page-container {
    padding: 14px 12px 36px;
  }

  .search-hero {
    padding: 18px 14px 16px;
    border-radius: var(--radius-lg);
  }

  .hero-search-box {
    flex-direction: column;
    gap: 8px;

    .hero-search-submit {
      width: 100%;
      justify-content: center;
      padding: 9px;
    }
  }

  .search-history-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;

    .clear-all-btn {
      align-self: flex-end;
    }
  }

  .search-summary-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
