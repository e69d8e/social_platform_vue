<script setup>
import PostCard from "@/components/PostCard.vue";
import CategoryComponent from "@/components/CategoryComponent.vue";
import CardGrid from "@/components/CardGrid.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import { useUserStore } from "@/stores/user";
import { getIndexPostsApi } from "@/api/postApi";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";

const userStore = useUserStore();

const {
  items: posts,
  loading,
  loadingMore,
  noMore,
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
  onError: () => ElMessage.error("加载帖子失败"),
});
</script>

<template>
  <div class="home">
    <div class="category">
      <CategoryComponent />
    </div>

    <div class="feed-head">
      <span class="feed-title">推荐</span>
    </div>

    <!-- 首屏骨架 -->
    <SkeletonGrid v-if="loading && posts.length === 0" :count="8" />

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
          <PostCard
            :id="item.id"
            :title="item.title"
            :content="item.content"
            :cover="item.cover"
            :like-count="item.likeCount"
            :liked="item.liked"
            :time="item.createTime"
            :view-count="item.viewCount"
            :delay="index < 12 ? index * 40 : 0"
          />
        </template>
      </CardGrid>
    </template>

    <LoadStatus
      :loading="loadingMore"
      :no-more="noMore"
      :has-items="posts.length > 0"
    />
  </div>
</template>

<style lang="scss" scoped>
.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .category {
    padding: 0 8px 16px;
  }

  .feed-head {
    padding: 4px 2px 14px;

    .feed-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-ink);
      padding-left: 12px;
      border-left: 3px solid var(--el-color-primary);
    }
  }
}
</style>
