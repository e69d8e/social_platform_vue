<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Search,
  Close,
  Delete,
  Document,
  User,
  TrendCharts,
  Right,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/stores/user";
import { useSearchHistory } from "@/composables/useSearchHistory";
import { HEADER_HISTORY_PAGE_SIZE } from "@/constants/pagination";
import { searchPostsApi, searchUsersApi } from "@/api/searchApi";
import { highlightKeyword } from "@/utils/searchHighlight";
import { debounce } from "lodash-es";

const router = useRouter();
const userStore = useUserStore();

const searchInputRef = ref(null);
const searchContent = ref("");
const dropdownVisible = ref(false);
const mobileSearchVisible = ref(false);
const isFocused = ref(false);

// 热门推荐标签
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
const { historyList, fetchHistory, deleteHistory, clearHistory } =
  useSearchHistory({ pageSize: HEADER_HISTORY_PAGE_SIZE });

// 实时搜索联想结果
const suggestLoading = ref(false);
const suggestPosts = ref([]);
const suggestUsers = ref([]);

// 请求序号：联想请求是并发的，慢的那次返回时会覆盖新关键词的结果，
// 必须只接受「最后一次输入」对应的响应。
let suggestSeq = 0;

const fetchSuggestions = debounce(async (keyword) => {
  const kw = keyword.trim();
  const seq = ++suggestSeq;
  if (!kw) {
    suggestPosts.value = [];
    suggestUsers.value = [];
    suggestLoading.value = false;
    return;
  }

  suggestLoading.value = true;
  try {
    const [postsRes, usersRes] = await Promise.allSettled([
      // record: 0 —— 联想不应该写进搜索历史
      searchPostsApi({ pageNum: 1, pageSize: 4, keyword: kw, record: 0 }),
      searchUsersApi({ pageNum: 1, pageSize: 3, keyword: kw, record: 0 }),
    ]);
    if (seq !== suggestSeq) return;

    suggestPosts.value =
      postsRes.status === "fulfilled" && postsRes.value?.data?.code === 1
        ? postsRes.value.data.data || []
        : [];
    suggestUsers.value =
      usersRes.status === "fulfilled" && usersRes.value?.data?.code === 1
        ? usersRes.value.data.data || []
        : [];
  } finally {
    if (seq === suggestSeq) suggestLoading.value = false;
  }
}, 220);

watch(searchContent, (val) => {
  if (val.trim()) {
    fetchSuggestions(val);
  } else {
    // 清空输入：作废在途请求，避免旧结果回填
    suggestSeq += 1;
    suggestLoading.value = false;
    suggestPosts.value = [];
    suggestUsers.value = [];
  }
});

const onSearchFocus = () => {
  isFocused.value = true;
  dropdownVisible.value = true;
  if (userStore.isLoggedIn) {
    fetchHistory();
  }
};

const onSearchBlur = () => {
  isFocused.value = false;
  // 延迟失焦关闭，保证下拉项的 mousedown 点击事件优先执行
  setTimeout(() => {
    dropdownVisible.value = false;
  }, 220);
};

// 移动端搜索弹窗打开时补拉一次历史
watch(mobileSearchVisible, (visible) => {
  if (visible && userStore.isLoggedIn) fetchHistory();
});

const executeSearch = (kw, type) => {
  const trimmed = (kw || "").trim();
  if (!trimmed) {
    ElMessage.warning("请输入搜索内容");
    return;
  }
  dropdownVisible.value = false;
  mobileSearchVisible.value = false;
  searchContent.value = "";
  const query = { keyword: trimmed };
  if (type !== undefined) {
    query.type = type;
  }
  router.push({ path: "/search", query });
};

const handleSearchSubmit = () => {
  executeSearch(searchContent.value);
};

const selectHotSearch = (tag) => {
  executeSearch(tag);
};

// 搜索历史不再区分类型，点击统一进入综合搜索
const historySearch = (item) => {
  executeSearch(item.keyword);
};

const goToPost = (postId) => {
  dropdownVisible.value = false;
  mobileSearchVisible.value = false;
  searchContent.value = "";
  router.push(`/post/${postId}`);
};

const goToUser = (userId) => {
  dropdownVisible.value = false;
  mobileSearchVisible.value = false;
  searchContent.value = "";
  router.push(`/user/${userId}`);
};

// 全局快捷键：Cmd+K / Ctrl+K 或按下 '/' 快捷聚焦搜索栏
const handleKeydown = (e) => {
  const targetTag = e.target?.tagName?.toLowerCase();
  const isInputting =
    targetTag === "input" ||
    targetTag === "textarea" ||
    e.target?.isContentEditable;

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    searchInputRef.value?.focus();
    return;
  }

  if (e.key === "/" && !isInputting) {
    e.preventDefault();
    searchInputRef.value?.focus();
    return;
  }

  if (e.key === "Escape" && dropdownVisible.value) {
    dropdownVisible.value = false;
    searchInputRef.value?.blur();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

const isMac = computed(() => {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || "")
  );
});
</script>

<template>
  <!-- 桌面端搜索区（>992px 显示） -->
  <div class="header-center">
    <div class="search-wrapper">
      <div
        class="search-box"
        :class="{ 'is-focused': isFocused }"
        @click="searchInputRef?.focus()"
      >
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          ref="searchInputRef"
          v-model="searchContent"
          type="text"
          class="native-search-input"
          placeholder="搜索帖子、用户、话题..."
          @keyup.enter="handleSearchSubmit"
          @focus="onSearchFocus"
          @blur="onSearchBlur"
        />
        <button
          v-if="searchContent"
          type="button"
          class="clear-btn"
          aria-label="清空输入"
          @mousedown.prevent="searchContent = ''"
        >
          <el-icon :size="13"><Close /></el-icon>
        </button>
        <div v-else-if="!isFocused" class="shortcut-badge">
          <span>{{ isMac ? "⌘K" : "Ctrl K" }}</span>
        </div>
        <button
          class="submit-action-btn"
          type="button"
          aria-label="开始搜索"
          @mousedown.prevent="handleSearchSubmit"
        >
          <el-icon :size="14"><Right /></el-icon>
        </button>
      </div>

      <!-- 下拉联想与探索浮层 -->
      <transition name="dropdown-pop">
        <div v-show="dropdownVisible" class="search-dropdown">
          <!-- 模式一：用户输入了关键词 -> 展示实时搜索联想 -->
          <div v-if="searchContent.trim()" class="suggest-panel">
            <div
              v-if="suggestLoading"
              class="dropdown-status-tip"
              v-loading="true"
            >
              正在搜索...
            </div>

            <template v-else-if="suggestPosts.length || suggestUsers.length">
              <!-- 匹配帖子 -->
              <div v-if="suggestPosts.length" class="suggest-section">
                <div class="section-title">
                  <el-icon><Document /></el-icon>
                  <span>相关帖子</span>
                </div>
                <div
                  v-for="post in suggestPosts"
                  :key="post.id"
                  class="suggest-item"
                  @mousedown.prevent="goToPost(post.id)"
                >
                  <span
                    class="item-title"
                    v-html="highlightKeyword(post.title, searchContent)"
                  ></span>
                  <span class="item-meta">
                    <span
                      v-if="post.nickname || post.username"
                      class="meta-author"
                      >{{ post.nickname || post.username }}</span
                    >
                    <span class="meta-views"
                      >{{ post.viewCount || 0 }} 浏览</span
                    >
                  </span>
                </div>
              </div>

              <!-- 匹配用户 -->
              <div v-if="suggestUsers.length" class="suggest-section">
                <div class="section-title">
                  <el-icon><User /></el-icon>
                  <span>相关用户</span>
                </div>
                <div
                  v-for="user in suggestUsers"
                  :key="user.id"
                  class="suggest-user-item"
                  @mousedown.prevent="goToUser(user.id)"
                >
                  <el-avatar
                    :size="26"
                    :src="user.avatar"
                    class="user-item-avatar"
                  />
                  <div class="user-item-text">
                    <span
                      class="user-item-name"
                      v-html="
                        highlightKeyword(
                          user.nickname || user.username,
                          searchContent,
                        )
                      "
                    ></span>
                    <span v-if="user.username" class="user-item-handle"
                      >@{{ user.username }}</span
                    >
                  </div>
                  <span class="user-item-fans"
                    >{{ user.fansCount ?? user.count ?? 0 }} 粉丝</span
                  >
                </div>
              </div>

              <!-- 底部直达完整搜索页按钮 -->
              <div
                class="suggest-footer"
                @mousedown.prevent="handleSearchSubmit"
              >
                <span>查看「{{ searchContent }}」的所有搜索结果</span>
                <el-icon><Right /></el-icon>
              </div>
            </template>

            <div v-else class="dropdown-empty">
              未找到与「{{ searchContent }}」直接相关的预览，按 Enter 深入探索
            </div>
          </div>

          <!-- 模式二：未输入关键词 -> 展示热门探索 + 搜索历史 -->
          <div v-else class="explore-panel">
            <!-- 热门搜索推荐 -->
            <div class="explore-section">
              <div class="section-title">
                <el-icon><TrendCharts /></el-icon>
                <span>热门探索</span>
              </div>
              <div class="hot-tags">
                <span
                  v-for="tag in HOT_SEARCHES"
                  :key="tag"
                  class="hot-tag"
                  @mousedown.prevent="selectHotSearch(tag)"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- 搜索历史 -->
            <div
              v-if="userStore.isLoggedIn && historyList.length"
              class="explore-section history-section"
            >
              <div class="section-title space-between">
                <span>搜索历史</span>
                <button
                  type="button"
                  class="clear-history-btn"
                  @mousedown.prevent="clearHistory"
                >
                  <el-icon :size="12"><Delete /></el-icon>
                  清空
                </button>
              </div>
              <div class="history-list">
                <div
                  v-for="item in historyList"
                  :key="item.id"
                  class="history-row"
                  @mousedown.prevent="historySearch(item)"
                >
                  <span class="history-keyword">{{ item.keyword }}</span>
                  <button
                    type="button"
                    class="history-del-btn"
                    aria-label="删除此记录"
                    @mousedown.stop="deleteHistory(item.id)"
                  >
                    <el-icon :size="12"><Close /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>

  <!-- 移动端快捷搜索按钮 (<992px 显示) -->
  <button
    class="mobile-tool-btn header-search-btn-mobile"
    title="搜索"
    type="button"
    @click="mobileSearchVisible = true"
  >
    <el-icon :size="16"><Search /></el-icon>
  </button>

  <!-- 移动端搜索弹窗 -->
  <el-dialog
    v-model="mobileSearchVisible"
    title="探索与搜索"
    width="min(520px, 94vw)"
    align-center
    :append-to-body="true"
    class="mobile-search-dialog"
  >
    <div class="mobile-search-body">
      <div class="mobile-input-row">
        <el-input
          v-model="searchContent"
          placeholder="搜索帖子或用户..."
          :prefix-icon="Search"
          clearable
          size="large"
          @keyup.enter="handleSearchSubmit"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearchSubmit"
              >搜索</el-button
            >
          </template>
        </el-input>
      </div>

      <!-- 热门探索 -->
      <div class="mobile-hot-section">
        <div class="mobile-section-head">
          <el-icon><TrendCharts /></el-icon>
          <span>热门话题与探索</span>
        </div>
        <div class="mobile-hot-tags">
          <span
            v-for="tag in HOT_SEARCHES"
            :key="tag"
            class="mobile-tag"
            @click="selectHotSearch(tag)"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 搜索历史 -->
      <div v-if="historyList.length" class="mobile-history">
        <div class="mobile-section-head space-between">
          <span>搜索历史</span>
          <el-button size="small" text type="danger" @click="clearHistory"
            >清空</el-button
          >
        </div>
        <div class="mobile-history-tags">
          <span
            v-for="item in historyList"
            :key="item.id"
            class="mobile-tag history-tag"
            @click="historySearch(item)"
          >
            {{ item.keyword }}
          </span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
  padding: 0 12px;
}

.search-wrapper {
  position: relative;
  width: 100%;
  max-width: 420px;
  min-width: 160px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  padding: 5px 8px 5px 14px;
  box-shadow: 0 1px 3px rgba(24, 24, 22, 0.03);
  transition: all var(--transition-base);

  &:hover {
    border-color: var(--el-color-primary-light-7);
    box-shadow: 0 2px 8px rgba(24, 24, 22, 0.05);
  }

  &.is-focused {
    border-color: var(--el-color-primary);
    box-shadow:
      0 0 0 3px var(--el-color-primary-light-9),
      var(--glow-primary);
  }
}

.search-icon {
  color: var(--text-placeholder);
  font-size: 15px;
  flex-shrink: 0;
  transition: color var(--transition-fast);

  .is-focused & {
    color: var(--el-color-primary);
  }
}

.native-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--text-ink);

  &::placeholder {
    color: var(--text-placeholder);
    font-size: 13px;
  }
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: var(--bg-subtle);
  color: var(--text-placeholder);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--border-default);
    color: var(--text-primary);
  }
}

.shortcut-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--bg-subtle);
  border: 1px solid var(--border-light);
  color: var(--text-placeholder);
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

.submit-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: var(--gradient-primary);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  box-shadow: 0 1px 4px rgba(204, 109, 78, 0.25);
  transition: all var(--transition-base);

  &:hover {
    transform: scale(1.08);
    box-shadow: var(--glow-primary);
  }

  &:active {
    transform: scale(0.96);
  }
}

// ---- 下拉浮层 ----
.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--glass-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  box-shadow:
    0 16px 36px -4px rgba(24, 24, 22, 0.12),
    0 4px 12px rgba(24, 24, 22, 0.04);
  border: 1px solid var(--border-default);
  z-index: 200;
  max-height: 380px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 0 6px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &.space-between {
    justify-content: space-between;
  }
}

.clear-history-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--text-placeholder);
  font-size: 11.5px;
  font-family: inherit;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-xs);
  transition: color var(--transition-fast);

  &:hover {
    color: var(--el-color-danger);
  }
}

// 热门标签区
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 16px 12px;
}

.hot-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-body);
  background: var(--bg-subtle);
  border-radius: var(--radius-full);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-base);

  &:hover {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    transform: translateY(-1px);
  }
}

// 搜索历史区
.history-section {
  border-top: 1px solid var(--border-light);
  padding-top: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-subtle);
  }

  .history-keyword {
    flex: 1;
    font-size: 13px;
    color: var(--text-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-del-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-placeholder);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--el-color-danger);
      background: var(--el-color-danger-light-9);
    }
  }
}

// 实时联想区
.suggest-section {
  &:not(:first-child) {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border-light);
  }
}

.suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-subtle);
  }

  .item-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: var(--text-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    :deep(.search-highlight) {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary-dark-2);
      padding: 0 2px;
      border-radius: 2px;
      font-weight: 700;
    }
  }

  .item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;

    .meta-author {
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.suggest-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-subtle);
  }

  .user-item-avatar {
    flex-shrink: 0;
  }

  .user-item-text {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .user-item-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    :deep(.search-highlight) {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary-dark-2);
      padding: 0 2px;
      border-radius: 2px;
      font-weight: 700;
    }
  }

  .user-item-handle {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-item-fans {
    font-size: 11px;
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.suggest-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 6px;
  margin-top: 4px;
  border-top: 1px solid var(--border-light);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--el-color-primary);
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--el-color-primary-light-9);
  }
}

.dropdown-status-tip,
.dropdown-empty {
  padding: 18px 16px;
  font-size: 13px;
  color: var(--text-placeholder);
  text-align: center;
}

// 动效
.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

// 移动端搜索弹窗样式
.mobile-tool-btn.header-search-btn-mobile {
  display: none;
}

.mobile-tool-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-base);

  &:hover,
  &.active {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);
  }
}

.mobile-search-body {
  display: flex;
  flex-direction: column;
  gap: 18px;

  .mobile-section-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 10px;

    &.space-between {
      justify-content: space-between;
    }
  }

  .mobile-hot-tags,
  .mobile-history-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mobile-tag {
    padding: 6px 13px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-body);
    background: var(--bg-subtle);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover,
    &:active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    &.history-tag {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
    }
  }
}

@media (max-width: 1280px) {
  .search-wrapper {
    max-width: 360px;
  }
}

@media (max-width: 1100px) {
  .shortcut-badge {
    display: none;
  }
}

@media (max-width: 960px) {
  .header-center {
    padding: 0 8px;
  }

  .search-wrapper {
    max-width: 100%;
    min-width: 140px;
  }
}

@media (max-width: 640px) {
  .header-center {
    padding: 0 4px;
  }

  .search-box {
    padding: 4px 6px 4px 10px;
    gap: 6px;
  }

  .native-search-input {
    font-size: 13px;

    &::placeholder {
      font-size: 12px;
    }
  }

  .submit-action-btn {
    width: 24px;
    height: 24px;
  }

  // 小屏幕下，搜索下拉浮层居中贴合展开
  .search-dropdown {
    position: fixed;
    top: 58px;
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 70vh;
  }
}

// 移动端搜索按钮彻底禁用，统一以原生输入框呈现
.mobile-tool-btn.header-search-btn-mobile {
  display: none !important;
}
</style>
