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
// import { ElMessage } from "element-plus";
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
  }, 150);
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
  searchContent.value = "";
  router.push({
    path: "/search",
    query: { keyword: item.keyword, type: item.type },
  });
};

const search = debounce(() => {
  historyVisible.value = false;
  router.push({
    path: "/search",
    query: { keyword: searchContent.value.trim() },
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

onMounted(() => {
  if (userStore.userInfo.username) {
    fetchUnreadCount();
    unreadTimer = setInterval(fetchUnreadCount, 30000);
  }
});

onUnmounted(() => {
  if (unreadTimer) {
    clearInterval(unreadTimer);
  }
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
                  @keyup.enter="search"
                  @focus="onSearchFocus"
                  @blur="onSearchBlur"
                  class="search-input"
                  clearable
                />
                <el-button
                  :icon="Search"
                  @click="search"
                  class="search-btn"
                />
              </div>
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
            </div>
          </div>

          <!-- 左侧工具：暗色模式 + AI助手 -->
          <div class="header-left-tools">
            <el-button
              class="theme-toggle"
              :icon="themeStore.isDark ? Sunny : Moon"
              circle
              @click="themeStore.toggle"
            />
            <el-button
              v-if="userStore.userInfo.username"
              type="primary"
              plain
              size="small"
              @click="$router.push('/aiChat')"
              >AI 助手</el-button
            >
          </div>

          <!-- 占位，将右侧内容推到右边 -->
          <div class="header-spacer" />

          <!-- 右侧按钮 -->
          <div class="header-actions">
            <template v-if="userStore.userInfo.username">
              <el-badge
                v-if="unreadCount > 0"
                :value="unreadCount"
                :max="99"
                class="msg-badge"
              >
                <el-button
                  type="info"
                  plain
                  size="small"
                  @click="$router.push('/conversations')"
                  >私信</el-button
                >
              </el-badge>
              <el-button
                v-else
                type="info"
                plain
                size="small"
                @click="$router.push('/conversations')"
                >私信</el-button
              >
              <el-button type="success" plain size="small" @click="myPosts"
                >我的帖子</el-button
              >
              <el-button
                type="primary"
                plain
                size="small"
                @click="myFollowPosts"
                >我的关注</el-button
              >
              <el-button
                size="small"
                class="publish-btn"
                @click="$router.push('/publicPost')"
                >发布</el-button
              >
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

      <el-main class="main">
        <el-row>
          <el-col :xs="0" :sm="1" :md="1" :lg="2" :xl="3" />
          <el-col :xs="24" :sm="22" :md="22" :lg="20" :xl="18">
            <router-view />
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
    background: rgba(250, 249, 245, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-light);
    box-shadow: var(--shadow-xs);

    html.dark & {
      background: rgba(24, 23, 21, 0.85);
    }
  }

  .header-inner {
    display: flex;
    align-items: center;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
    height: 70px;
    position: relative;
  }

  // ---- Logo ----
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
  }

  .logo-img {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 700;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .logo-icon {
    font-size: 18px;
    color: var(--el-color-primary);
    opacity: 0.7;
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
    transition: all var(--transition-base);

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  .sign-text {
    white-space: nowrap;
  }

  // ---- Left tools ----
  .header-left-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
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
    max-width: 340px;
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
      border-radius: 20px;
      padding: 4px 16px;
      box-shadow: 0 0 0 1px var(--border-default) inset;
      transition: all var(--transition-base);

      &:focus-within {
        box-shadow: 0 0 0 2px var(--el-color-primary) inset,
          var(--glow-primary);
      }
    }
  }

  .search-btn {
    margin-left: 8px;
    border-radius: 50%;
    width: 34px;
    height: 34px;
    padding: 0;
    background: var(--gradient-primary);
    border: none;
    color: #fff;

    &:hover {
      transform: scale(1.05);
      box-shadow: var(--glow-primary);
    }
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
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
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
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
        font-size: 14px;
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

  // ---- Theme toggle ----
  .theme-toggle {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);

    &:hover {
      background: var(--bg-subtle);
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
    }
  }

  // ---- Action buttons ----
  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    .publish-btn {
      background: var(--gradient-primary);
      border: none;
      color: #fff;
      font-weight: 500;
      border-radius: var(--radius-md);
      padding: 6px 16px;
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--glow-primary);
      }
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
    border: 2px solid transparent;
    background-image: var(--gradient-primary);
    background-origin: border-box;
    background-clip: padding-box, border-box;
    transition: transform var(--transition-base);

    &:hover {
      transform: scale(1.08);
    }
  }

  .user-info {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .user-nickname {
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
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
  }

  // ---- Main content ----
  .main {
    padding: 0;
    min-height: calc(100vh - 70px);
    background: var(--bg-page);
  }
}

// ---- Responsive ----
@media (max-width: 992px) {
  .header-center,
  .header-actions {
    display: none;
  }
}

@media (max-width: 640px) {
  .header-inner {
    padding: 0 12px;
    gap: 10px;
    height: 60px;
  }

  .logo-text {
    font-size: 16px;
  }

  .sign-text {
    display: none;
  }

  .header-left-tools {
    gap: 4px;
  }
}
</style>
