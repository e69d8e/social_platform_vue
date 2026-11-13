<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Refresh, Close } from "@element-plus/icons-vue";
import PostCard from "@/components/PostCard.vue";
import CategoryComponent from "@/components/CategoryComponent.vue";
import CardGrid from "@/components/CardGrid.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import { useUserStore } from "@/stores/user";
import {
  getIndexPostsApi,
  submitRecommendFeedbackApi,
  undoRecommendFeedbackApi,
} from "@/api/postApi";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { FEED_PAGE_SIZE } from "@/constants/pagination";

const FEED_MODES = [
  {
    key: "recommend",
    label: "为你推荐",
    subtitle: "结合你的兴趣标签与近期互动精选",
  },
  {
    key: "hot",
    label: "热门精选",
    subtitle: "社区近期高热度与高互动创作",
  },
  {
    key: "latest",
    label: "最新发布",
    subtitle: "实时更新的社区最新创作",
  },
];

const VALID_MODES = new Set(FEED_MODES.map((m) => m.key));
const normalizeMode = (raw) => (VALID_MODES.has(raw) ? raw : "recommend");

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const activeMode = ref(normalizeMode(route.query.mode));
const feedSeed = ref(0);
const pendingRefresh = ref(false);
const reshuffling = ref(false);

// 本地即刻过滤状态（访客本地生效 + 登录态与后端联动，并支持一键撤销恢复）
const hiddenRules = ref({
  POST: new Set(),
  CATEGORY: new Set(),
  TAG: new Set(),
  AUTHOR: new Set(),
});
const feedbackBanner = ref(null);
let bannerTimer = null;

const clearBannerTimer = () => {
  if (bannerTimer) {
    clearTimeout(bannerTimer);
    bannerTimer = null;
  }
};

onUnmounted(() => {
  clearBannerTimer();
});

const currentModeMeta = computed(
  () => FEED_MODES.find((m) => m.key === activeMode.value) || FEED_MODES[0],
);

const {
  items: posts,
  loading,
  loadingMore,
  noMore,
  isError,
  retry,
  reload,
} = useInfiniteScroll({
  fetchPage: async (cursor) => {
    const isRefresh = pendingRefresh.value;
    pendingRefresh.value = false;
    const res = await getIndexPostsApi({
      lastId: cursor.lastId,
      offset: cursor.offset,
      mode: activeMode.value,
      refresh: isRefresh,
      seed: feedSeed.value || undefined,
    });
    const payload = res.data?.data ?? {};
    if (payload.seed) {
      feedSeed.value = payload.seed;
    }
    return {
      list: payload.list ?? [],
      minTime: payload.minTime,
      offset: payload.offset,
      hasMore: payload.hasMore,
    };
  },
  autoFill: true,
});

const visiblePosts = computed(() => {
  const rules = hiddenRules.value;
  return posts.value.filter((post) => {
    if (rules.POST.has(String(post.id))) return false;
    if (post.categoryId && rules.CATEGORY.has(String(post.categoryId))) {
      return false;
    }
    if (post.userId && rules.AUTHOR.has(String(post.userId))) return false;
    if (
      Array.isArray(post.tags) &&
      post.tags.some((t) => t?.id && rules.TAG.has(String(t.id)))
    ) {
      return false;
    }
    return true;
  });
});

watch(
  () => route.query.mode,
  async (val) => {
    const target = normalizeMode(val);
    if (target !== activeMode.value) {
      activeMode.value = target;
      feedSeed.value = 0;
      pendingRefresh.value = false;
      await reload();
    }
  },
);

const switchMode = async (mode) => {
  if (mode === activeMode.value) return;
  activeMode.value = mode;
  feedSeed.value = 0;
  pendingRefresh.value = false;
  feedbackBanner.value = null;
  clearBannerTimer();
  router.replace({
    query: {
      ...route.query,
      mode: mode === "recommend" ? undefined : mode,
    },
  });
  await reload();
};

// 换一换：向服务端请求新一批未曝光内容（带 refresh=true 与新 seed）
const reshuffle = async () => {
  if (reshuffling.value) return;
  reshuffling.value = true;
  try {
    pendingRefresh.value = activeMode.value !== "latest";
    feedSeed.value =
      activeMode.value === "latest" ? 0 : (Date.now() % 1000000) + 1;
    await reload();
  } finally {
    reshuffling.value = false;
  }
};

const addLocalRule = (targetType, targetId) => {
  const next = {
    POST: new Set(hiddenRules.value.POST),
    CATEGORY: new Set(hiddenRules.value.CATEGORY),
    TAG: new Set(hiddenRules.value.TAG),
    AUTHOR: new Set(hiddenRules.value.AUTHOR),
  };
  next[targetType]?.add(String(targetId));
  hiddenRules.value = next;
};

const removeLocalRule = (targetType, targetId) => {
  const next = {
    POST: new Set(hiddenRules.value.POST),
    CATEGORY: new Set(hiddenRules.value.CATEGORY),
    TAG: new Set(hiddenRules.value.TAG),
    AUTHOR: new Set(hiddenRules.value.AUTHOR),
  };
  next[targetType]?.delete(String(targetId));
  hiddenRules.value = next;
};

const handleFeedback = async ({ targetType, targetId, label }) => {
  if (!targetType || !targetId) return;
  addLocalRule(targetType, targetId);

  let persisted = false;
  if (userStore.isLoggedIn) {
    try {
      const res = await submitRecommendFeedbackApi({
        targetType,
        targetId,
        reason: label,
      });
      persisted = res.data?.code === 1;
      if (!persisted) {
        removeLocalRule(targetType, targetId);
        return;
      }
    } catch {
      removeLocalRule(targetType, targetId);
      return;
    }
  }

  feedbackBanner.value = { targetType, targetId, label, persisted };
  clearBannerTimer();
  bannerTimer = setTimeout(() => {
    feedbackBanner.value = null;
  }, 6000);
};

const dismissBanner = () => {
  feedbackBanner.value = null;
  clearBannerTimer();
};

const undoLastFeedback = async () => {
  const current = feedbackBanner.value;
  if (!current) return;
  removeLocalRule(current.targetType, current.targetId);
  feedbackBanner.value = null;
  clearBannerTimer();
  if (current.persisted && userStore.isLoggedIn) {
    try {
      await undoRecommendFeedbackApi({
        targetType: current.targetType,
        targetId: current.targetId,
      });
    } catch {
      // 拦截器已提示错误
    }
  }
};
</script>

<template>
  <div class="home">
    <div class="category">
      <CategoryComponent />
    </div>

    <div class="feed-head">
      <div class="feed-head-left">
        <div class="mode-tabs" role="tablist" aria-label="首页推荐模式">
          <button
            v-for="mode in FEED_MODES"
            :key="mode.key"
            type="button"
            role="tab"
            :aria-selected="activeMode === mode.key"
            class="mode-tab"
            :class="{ active: activeMode === mode.key }"
            @click="switchMode(mode.key)"
          >
            {{ mode.label }}
          </button>
        </div>
        <span class="feed-subtitle">{{ currentModeMeta.subtitle }}</span>
      </div>

      <button
        class="reshuffle-btn"
        type="button"
        :class="{ spinning: reshuffling }"
        :disabled="reshuffling"
        :title="activeMode === 'latest' ? '刷新最新创作' : '换一批未看内容'"
        @click="reshuffle"
      >
        <el-icon :size="14"><Refresh /></el-icon>
        <span>{{ activeMode === "latest" ? "刷新" : "换一换" }}</span>
      </button>
    </div>

    <transition name="banner-fade">
      <div v-if="feedbackBanner" class="feedback-banner" role="status">
        <span class="banner-text">
          已为你减少 <strong>{{ feedbackBanner.label }}</strong> 相关推荐
          <template v-if="!feedbackBanner.persisted">（当前浏览生效）</template>
        </span>
        <div class="banner-actions">
          <button type="button" class="undo-btn" @click="undoLastFeedback">
            撤销
          </button>
          <button
            type="button"
            class="close-btn"
            aria-label="关闭提示"
            @click="dismissBanner"
          >
            <el-icon :size="13"><Close /></el-icon>
          </button>
        </div>
      </div>
    </transition>

    <!-- 首屏骨架 -->
    <SkeletonGrid
      v-if="loading && posts.length === 0"
      :count="FEED_PAGE_SIZE"
    />

    <template v-else>
      <el-empty v-if="visiblePosts.length === 0" description="暂无更多内容">
        <el-button
          v-if="userStore.userInfo.username"
          type="primary"
          round
          @click="$router.push('/publicPost')"
          >去发布第一篇</el-button
        >
        <el-button v-else type="primary" round @click="$router.push('/login')"
          >去登录逛逛</el-button
        >
      </el-empty>

      <CardGrid v-else :items="visiblePosts">
        <template #item="{ item, index }">
          <PostCard
            :post="item"
            :delay="index < 12 ? index * 40 : 0"
            show-recommend-meta
            show-feedback
            @feedback="handleFeedback"
          />
        </template>
      </CardGrid>
    </template>

    <LoadStatus
      :loading="loadingMore"
      :no-more="noMore"
      :is-error="isError"
      :has-items="visiblePosts.length > 0"
      @retry="retry"
    />
  </div>
</template>

<style lang="scss" scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 20px 40px;

  .category {
    padding: 0 0 16px;
  }

  .feed-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0 16px;

    .feed-head-left {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      min-width: 0;
    }

    .mode-tabs {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px;
      border-radius: var(--radius-full);
      background: var(--bg-subtle);
      border: 1px solid var(--border-light);
    }

    .mode-tab {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 13.5px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-ink);
      }

      &.active {
        background: var(--bg-card);
        color: var(--el-color-primary);
        font-weight: 600;
        box-shadow: var(--shadow-sm);
      }
    }

    .reshuffle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-default);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-base);

      &:hover:not(:disabled) {
        color: var(--el-color-primary);
        border-color: var(--el-color-primary-light-7);
        background: var(--el-color-primary-light-9);
      }

      &:disabled {
        cursor: wait;
        opacity: 0.7;
      }

      &.spinning .el-icon {
        animation: reshuffle-spin 0.6s linear infinite;
      }
    }

    .feed-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }
  }

  .feedback-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 14px;
    margin-bottom: 14px;
    border-radius: var(--radius-lg);
    background: var(--bg-subtle);
    border: 1px solid var(--border-light);
    font-size: 13px;
    color: var(--text-secondary);

    .banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .undo-btn {
      border: none;
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;

      &:hover {
        opacity: 0.88;
      }
    }

    .close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;

      &:hover {
        background: var(--bg-muted);
      }
    }
  }
}

.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: all 0.2s ease;
}

.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes reshuffle-spin {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .home {
    padding: 10px 8px 36px;

    .category {
      padding: 0 2px 6px;
    }

    .feed-head {
      padding: 2px 2px 10px;

      .mode-tab {
        padding: 5px 10px;
        font-size: 12.5px;
      }

      .reshuffle-btn {
        padding: 4px 10px;
        font-size: 12px;
      }

      .feed-subtitle {
        display: none;
      }
    }
  }
}
</style>
