<script setup>
import { ref, onUnmounted, onMounted, computed, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import {
  Search,
  HomeFilled,
  Close,
  Delete,
  Sunny,
  Moon,
  ChatDotRound,
  Edit,
} from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { useThemeStore } from "@/stores/theme";
import { signInApi } from "@/api/userApi";
import {
  getSearchHistoryApi,
  deleteSearchHistoryApi,
  clearSearchHistoryApi,
} from "@/api/searchApi";
import { getUnreadCountApi } from "@/api/messageApi";
import { useRouter } from "vue-router";
import { useSignStore } from "@/stores/sign";
import { debounce } from "lodash-es";
import formattedCount from "@/utils/formattedCount";
import { ElMessage } from "element-plus";
import { logoUrl } from "@/utils/request";

const signStore = useSignStore();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const themeStore = useThemeStore();
const searchContent = ref("");
const historyVisible = ref(false);
const historyList = ref([]);
const historyLoading = ref(false);
const mobileSearchVisible = ref(false);

const isConversationsActive = computed(
  () => route.path === "/conversations" || route.path.startsWith("/chat/"),
);
const isMyPostsActive = computed(
  () => route.path === "/postList/" + userStore.userInfo.id,
);
const isMyFollowPostsActive = computed(() => route.path === "/followPosts");
const isAiChatActive = computed(() => route.path === "/aiChat");

const fetchSearchHistory = async () => {
  historyLoading.value = true;
  try {
    const res = await getSearchHistoryApi({ pageNum: 1, pageSize: 10 });
    historyList.value = res.data.data || [];
  } catch {
    // silently fail
  } finally {
    historyLoading.value = false;
  }
};

const onSearchFocus = () => {
  fetchSearchHistory();
  historyVisible.value = true;
};

const onSearchBlur = () => {
  setTimeout(() => {
    historyVisible.value = false;
  }, 200);
};

const deleteHistoryItem = async (id) => {
  try {
    await deleteSearchHistoryApi(id);
    historyList.value = historyList.value.filter((h) => h.id !== id);
  } catch {
    // silently fail
  }
};

const clearAllHistory = async () => {
  try {
    await clearSearchHistoryApi();
    historyList.value = [];
  } catch {
    // silently fail
  }
};

const historySearch = (item) => {
  historyVisible.value = false;
  mobileSearchVisible.value = false;
  searchContent.value = "";
  router.push({
    path: "/search",
    query: { keyword: item.keyword, type: item.type },
  });
};

const handleSearchSubmit = () => {
  const kw = searchContent.value.trim();
  if (!kw) {
    ElMessage.warning("请输入搜索内容");
    return;
  }
  historyVisible.value = false;
  mobileSearchVisible.value = false;
  search.cancel();
  router.push({
    path: "/search",
    query: { keyword: kw },
  });
  searchContent.value = "";
};

const search = debounce(() => {
  const kw = searchContent.value.trim();
  if (!kw) return;
  historyVisible.value = false;
  mobileSearchVisible.value = false;
  router.push({
    path: "/search",
    query: { keyword: kw },
  });
  searchContent.value = "";
}, 300);

onUnmounted(() => {
  search.cancel();
});

const myFollowPosts = () => router.push({ path: "/followPosts" });
const myPosts = () =>
  router.push({ path: "/postList/" + userStore.userInfo.id });
const toFans = () => router.push({ path: "/fans/" + userStore.userInfo.id });

const sign = async () => {
  const res = await signInApi();
  if (res.data.code === 1) {
    if (signStore.signDay < res.data.data) {
      ElMessage.success("签到成功");
    } else {
      ElMessage.info("今天已经签到过了");
    }
    signStore.signDay = res.data.data;
  } else {
    ElMessage.error(res.data.message);
  }
};

const fansCount = computed(() => formattedCount(userStore.userInfo.fansCount));

const unreadCount = ref(0);

const fetchUnreadCount = async () => {
  try {
    const res = await getUnreadCountApi();
    if (res.data.code === 1) {
      unreadCount.value = res.data.data || 0;
    }
  } catch {
    // silently fail
  }
};

let unreadTimer = null;

const startUnreadPolling = () => {
  stopUnreadPolling();
  unreadTimer = setInterval(fetchUnreadCount, 30000);
};

const stopUnreadPolling = () => {
  if (unreadTimer) {
    clearInterval(unreadTimer);
    unreadTimer = null;
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    stopUnreadPolling();
  } else if (userStore.userInfo.username) {
    fetchUnreadCount();
    startUnreadPolling();
  }
};

onMounted(() => {
  if (userStore.userInfo.username) {
    fetchUnreadCount();
    startUnreadPolling();
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  stopUnreadPolling();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

watch(
  () => route.path,
  () => {
    if (userStore.userInfo.username) {
      fetchUnreadCount();
    }
  },
);
</script>

<template>
  <div class="layout">
    <el-container>
      <el-header class="header" height="auto">
        <div class="header-inner">
          <!-- 左侧：Logo + 签到 -->
          <div class="header-left">
            <div class="logo" @click="$router.push('/')">
              <el-image class="logo-img" :src="logoUrl" />
              <span class="logo-text">Y社区</span>
              <el-icon class="logo-icon"><HomeFilled /></el-icon>
            </div>
            <div v-if="userStore.userInfo.username" class="sign" @click="sign">
              <el-tag size="small" effect="plain" type="warning"
                >点击签到</el-tag
              >
              <span class="sign-text"
                >本月已连续签到 {{ signStore.signDay }} 天</span
              >
            </div>
          </div>

          <!-- 中间：搜索 -->
          <div class="header-center">
            <div class="search-wrapper">
              <div class="search-row">
                <el-input
                  v-model="searchContent"
                  placeholder="搜索帖子或用户"
                  :prefix-icon="Search"
                  @keyup.enter="handleSearchSubmit"
                  @focus="onSearchFocus"
                  @blur="onSearchBlur"
                  class="search-input"
                  clearable
                />
                <el-button :icon="Search" @click="handleSearchSubmit" class="search-btn" />
              </div>
              <transition name="dropdown">
                <div
                  v-show="historyVisible && historyList.length"
                  class="search-dropdown"
                  v-loading="historyLoading"
                >
                  <div class="dropdown-header">
                    <span>搜索历史</span>
                    <el-button
                      size="small"
                      text
                      type="danger"
                      @click="clearAllHistory"
                    >
                      <el-icon><Delete /></el-icon>
                      清空
                    </el-button>
                  </div>
                  <div
                    v-for="item in historyList"
                    :key="item.id"
                    class="dropdown-item"
                    @mousedown.prevent="historySearch(item)"
                  >
                    <span class="item-keyword">{{ item.keyword }}</span>
                    <span class="item-type">{{
                      item.type === 0 ? "帖子" : "用户"
                    }}</span>
                    <el-icon
                      class="item-close"
                      @mousedown.stop="deleteHistoryItem(item.id)"
                      ><Close
                    /></el-icon>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- 左侧工具：暗色模式 + AI助手 -->
          <div class="header-left-tools">
            <button
              class="theme-toggle-btn"
              :title="themeStore.isDark ? '切换浅色模式' : '切换暗色模式'"
              type="button"
              @click="themeStore.toggle"
            >
              <el-icon :size="16">
                <Sunny v-if="themeStore.isDark" />
                <Moon v-else />
              </el-icon>
            </button>
            <button
              v-if="userStore.userInfo.username"
              class="nav-pill ai-nav-pill"
              :class="{ 'is-nav-active': isAiChatActive }"
              type="button"
              @click="$router.push('/aiChat')"
            >
              <span class="ai-sparkle">✦</span>
              <span>AI 助手</span>
            </button>
          </div>

          <!-- 占位，将右侧内容推到右边 -->
          <div class="header-spacer" />

          <!-- 移动端快捷工具栏 (<992px 显示) -->
          <div class="header-mobile-tools">
            <button
              class="mobile-tool-btn"
              title="搜索"
              type="button"
              @click="mobileSearchVisible = true"
            >
              <el-icon :size="16"><Search /></el-icon>
            </button>
            <template v-if="userStore.userInfo.username">
              <el-badge
                v-if="unreadCount > 0"
                :value="unreadCount"
                :max="99"
                class="msg-badge"
              >
                <button
                  class="mobile-tool-btn"
                  :class="{ active: isConversationsActive }"
                  title="私信"
                  type="button"
                  @click="$router.push('/conversations')"
                >
                  <el-icon :size="16"><ChatDotRound /></el-icon>
                </button>
              </el-badge>
              <button
                v-else
                class="mobile-tool-btn"
                :class="{ active: isConversationsActive }"
                title="私信"
                type="button"
                @click="$router.push('/conversations')"
              >
                <el-icon :size="16"><ChatDotRound /></el-icon>
              </button>
              <button
                class="mobile-tool-btn primary"
                title="发帖"
                type="button"
                @click="$router.push('/publicPost')"
              >
                <el-icon :size="16"><Edit /></el-icon>
              </button>
            </template>
          </div>

          <!-- 右侧按钮 (桌面端) -->
          <div class="header-actions">
            <template v-if="userStore.userInfo.username">
              <el-badge
                v-if="unreadCount > 0"
                :key="unreadCount"
                :value="unreadCount"
                :max="99"
                class="msg-badge"
              >
                <button
                  class="nav-pill"
                  :class="{ 'is-nav-active': isConversationsActive }"
                  type="button"
                  @click="$router.push('/conversations')"
                >
                  私信
                </button>
              </el-badge>
              <button
                v-else
                class="nav-pill"
                :class="{ 'is-nav-active': isConversationsActive }"
                type="button"
                @click="$router.push('/conversations')"
              >
                私信
              </button>
              <button
                class="nav-pill"
                :class="{ 'is-nav-active': isMyPostsActive }"
                type="button"
                @click="myPosts"
              >
                我的帖子
              </button>
              <button
                class="nav-pill"
                :class="{ 'is-nav-active': isMyFollowPostsActive }"
                type="button"
                @click="myFollowPosts"
              >
                我的关注
              </button>
              <button
                class="publish-btn"
                type="button"
                @click="$router.push('/publicPost')"
              >
                <el-icon :size="14"><Edit /></el-icon>
                <span>发布</span>
              </button>
            </template>
          </div>

          <!-- 右侧用户 -->
          <div class="header-user">
            <template v-if="!userStore.userInfo.username">
              <el-button type="primary" @click="$router.push('/login')"
                >去登录</el-button
              >
            </template>
            <template v-else>
              <el-avatar
                class="user-avatar"
                :size="40"
                :src="userStore.userInfo.avatar"
                @click="$router.push('/my')"
              />
              <div class="user-info">
                <span class="user-nickname" @click="$router.push('/my')">
                  {{ userStore.userInfo.nickname }}
                </span>
                <el-text
                  size="small"
                  type="primary"
                  class="user-fans"
                  @click="toFans"
                >
                  {{ fansCount }} 粉
                </el-text>
              </div>
            </template>
          </div>
        </div>
      </el-header>

      <!-- 移动端搜索弹窗 -->
      <el-dialog
        v-model="mobileSearchVisible"
        title="搜索"
        width="min(500px, 92vw)"
        align-center
      >
        <div class="mobile-search-body">
          <el-input
            v-model="searchContent"
            placeholder="搜索帖子或用户"
            :prefix-icon="Search"
            clearable
            size="large"
            @keyup.enter="handleSearchSubmit"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearchSubmit">搜索</el-button>
            </template>
          </el-input>

          <div v-if="historyList.length" class="mobile-history">
            <div class="mobile-history-head">
              <span>搜索历史</span>
              <el-button size="small" text type="danger" @click="clearAllHistory">清空</el-button>
            </div>
            <div class="mobile-history-tags">
              <span
                v-for="item in historyList"
                :key="item.id"
                class="mobile-tag"
                @click="historySearch(item)"
              >
                {{ item.keyword }}
              </span>
            </div>
          </div>
        </div>
      </el-dialog>

      <el-main class="main">
        <el-row>
          <el-col :xs="0" :sm="1" :md="1" :lg="2" :xl="3" />
          <el-col :xs="24" :sm="22" :md="22" :lg="20" :xl="18">
            <router-view v-slot="{ Component, route }">
              <Transition name="page" mode="out-in">
                <component :is="Component" :key="route.path" />
              </Transition>
            </router-view>
          </el-col>
          <el-col :xs="0" :sm="1" :md="1" :lg="2" :xl="3" />
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  background: var(--bg-page);

  // ---- Header (frosted glass) ----
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 0;
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--glass-border);
    box-shadow: 0 1px 12px rgba(24, 24, 22, 0.03);
    transition: background-color var(--transition-base), border-color var(--transition-base);
  }

  .header-inner {
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    height: 64px;
    position: relative;
  }

  // ---- Logo ----
  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
    transition: transform var(--transition-base);

    &:hover {
      transform: translateY(-1px);
    }
  }

  .logo-img {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px rgba(204, 109, 78, 0.2);
  }

  .logo-text {
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .logo-icon {
    font-size: 16px;
    color: var(--el-color-primary);
    opacity: 0.8;
  }

  // ---- Sign-in ----
  .sign {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: var(--bg-subtle);
    border: 1px solid var(--border-light);
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
      transform: translateY(-1px);
    }
  }

  .sign-text {
    white-space: nowrap;
    font-size: 11px;
    color: var(--text-secondary);
  }

  // ---- Left tools ----
  .header-left-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .theme-toggle-btn {
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
    transition: all var(--transition-base);

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
      background: var(--bg-subtle);
      transform: rotate(15deg);
    }
  }

  .ai-nav-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 500;

    .ai-sparkle {
      font-size: 12px;
      color: var(--el-color-warning);
    }
  }

  .header-spacer {
    flex: 1;
    min-width: 0;
  }

  // ---- Search ----
  .header-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    max-width: 360px;
    width: 100%;
  }

  .search-wrapper {
    position: relative;
    width: 100%;
  }

  .search-row {
    display: flex;
    align-items: center;
  }

  .search-input {
    flex: 1;

    :deep(.el-input__wrapper) {
      border-radius: var(--radius-full);
      padding: 4px 14px;
      background: var(--bg-card);
      box-shadow: 0 0 0 1px var(--border-default) inset;
      transition: all var(--transition-base);

      &:hover {
        box-shadow: 0 0 0 1px var(--el-color-primary-light-7) inset;
      }

      &:focus-within {
        box-shadow:
          0 0 0 2px var(--el-color-primary) inset,
          var(--glow-primary);
      }
    }
  }

  .search-btn {
    margin-left: 6px;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--gradient-primary);
    border: none;
    color: #fff;
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      transform: scale(1.06);
      box-shadow: var(--glow-primary);
    }
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--glass-card);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border-default);
    z-index: 200;
    padding: 8px 0;
    max-height: 320px;
    overflow-y: auto;

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 14px 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-light);
      margin-bottom: 4px;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      cursor: pointer;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--bg-subtle);
      }

      .item-keyword {
        flex: 1;
        font-size: 13.5px;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .item-type {
        font-size: 11px;
        color: var(--text-placeholder);
        flex-shrink: 0;
      }

      .item-close {
        font-size: 12px;
        color: var(--text-placeholder);
        flex-shrink: 0;
        transition: color var(--transition-fast);

        &:hover {
          color: var(--el-color-danger);
        }
      }
    }
  }

  // ---- Navigation Pills & Buttons ----
  .nav-pill {
    appearance: none;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    padding: 6px 14px;
    font-size: 13.5px;
    font-weight: 500;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-base);

    &:hover {
      background: var(--bg-subtle);
      color: var(--el-color-primary);
    }

    &.is-nav-active {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
      font-weight: 600;
      box-shadow: var(--shadow-xs);
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    .msg-badge :deep(.el-badge__content) {
      animation: badge-pop 0.35s ease;
    }

    .publish-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--gradient-primary);
      border: none;
      color: #fff;
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      border-radius: var(--radius-full);
      padding: 7px 18px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(204, 109, 78, 0.25);
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--glow-primary);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  // ---- Mobile Header Tools ----
  .header-mobile-tools {
    display: none;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .mobile-tool-btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--border-default);
      background: var(--bg-card);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover,
      &.active {
        color: var(--el-color-primary);
        border-color: var(--el-color-primary-light-7);
        background: var(--el-color-primary-light-9);
      }

      &.primary {
        background: var(--gradient-primary);
        border: none;
        color: #fff;
        box-shadow: var(--shadow-xs);
      }
    }

    .msg-badge :deep(.el-badge__content) {
      animation: badge-pop 0.35s ease;
    }
  }

  // ---- User section ----
  .header-user {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .user-avatar {
    cursor: pointer;
    flex-shrink: 0;
    border: 2px solid var(--border-light);
    transition: transform var(--transition-base), border-color var(--transition-base);

    &:hover {
      transform: scale(1.06);
      border-color: var(--el-color-primary);
      box-shadow: var(--glow-primary);
    }
  }

  .user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .user-nickname {
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--transition-base);

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .user-fans {
    cursor: pointer;
    font-size: 11px;
  }

  // ---- Main content ----
  .main {
    padding: 0;
    min-height: calc(100vh - 64px);
    background: var(--bg-page);
  }
}

// 移动端搜索弹窗样式
.mobile-search-body {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .mobile-history {
    .mobile-history-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .mobile-history-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .mobile-tag {
      padding: 5px 12px;
      font-size: 13px;
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover,
      &:active {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }
  }
}

// 未读徽标数字变化时的小弹跳
@keyframes badge-pop {
  0% {
    transform: scale(0.5);
  }

  60% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}

// ---- Responsive ----
@media (max-width: 992px) {
  .layout .header {
    .header-center,
    .header-actions {
      display: none;
    }

    .header-mobile-tools {
      display: flex;
    }
  }
}

@media (max-width: 640px) {
  .layout .header-inner {
    padding: 0 12px;
    gap: 8px;
    height: 60px;
  }

  .layout .logo-text {
    font-size: 16px;
  }

  .layout .sign-text {
    display: none;
  }

  .layout .header-left-tools {
    gap: 4px;
  }
}
</style>
