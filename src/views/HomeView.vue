<script setup>
import { ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import PostCard from "@/components/PostCard.vue";
import CategoryComponent from "@/components/CategoryComponent.vue";
import CardGrid from "@/components/CardGrid.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import { useUserStore } from "@/stores/user";
import { getIndexPostsApi } from "@/api/postApi";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { FEED_PAGE_SIZE } from "@/constants/pagination";

const userStore = useUserStore();
const reshuffling = ref(false);

const {
  items: posts,
  loading,
  loadingMore,
  noMore,
  isError,
  retry,
} = useInfiniteScroll({
  fetchPage: async (cursor) => {
    const res = await getIndexPostsApi({
      lastId: cursor.lastId,
      offset: cursor.offset,
    });
    return {
      list: res.data.data.list,
      minTime: res.data.data.minTime,
      offset: res.data.data.offset,
    };
  },
  autoFill: true,
});

// 换一换：把当前已加载的推荐流就地洗牌，立即换一批阅读顺序（游标续传不受影响）
const reshuffle = () => {
  if (reshuffling.value || posts.value.length < 2) return;
  reshuffling.value = true;
  const arr = [...posts.value];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  posts.value = arr;
  setTimeout(() => {
    reshuffling.value = false;
  }, 300);
};
</script>

<template>
  <div class="home">
    <div class="category">
      <CategoryComponent />
    </div>

    <div class="feed-head">
      <div class="feed-head-left">
        <span class="section-title feed-title">推荐流</span>
        <span class="feed-subtitle">探索最新创作与社区热门讨论</span>
      </div>
      <button
        class="reshuffle-btn"
        type="button"
        :class="{ spinning: reshuffling }"
        :disabled="reshuffling"
        title="换一换"
        @click="reshuffle"
      >
        <el-icon :size="14"><Refresh /></el-icon>
        <span>换一换</span>
      </button>
    </div>

    <!-- 首屏骨架 -->
    <SkeletonGrid
      v-if="loading && posts.length === 0"
      :count="FEED_PAGE_SIZE"
    />

    <template v-else>
      <el-empty v-if="posts.length === 0" description="还没有帖子">
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

      <CardGrid v-else :items="posts">
        <template #item="{ item, index }">
          <PostCard :post="item" :delay="index < 12 ? index * 40 : 0" />
        </template>
      </CardGrid>
    </template>

    <LoadStatus
      :loading="loadingMore"
      :no-more="noMore"
      :is-error="isError"
      :has-items="posts.length > 0"
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
    padding: 6px 0 16px;

    .feed-head-left {
      display: flex;
      align-items: baseline;
      gap: 12px;
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
        animation: reshuffle-spin 0.6s ease;
      }
    }

    .feed-title {
      margin-bottom: 0; // 覆盖 .section-title 的下边距，与副标题同行
    }

    .feed-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }
  }
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

      .feed-title {
        font-size: 15px;
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
