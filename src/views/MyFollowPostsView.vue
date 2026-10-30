<script setup>
import PostCard from "@/components/PostCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import { getFollowPostsApi } from "@/api/postApi";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { FEED_PAGE_SIZE } from "@/constants/pagination";

const {
  items: posts,
  loading,
  loadingMore,
  noMore,
  isError,
  retry,
} = useInfiniteScroll({
  fetchPage: async (cursor) => {
    const res = await getFollowPostsApi({
      lastId: cursor.lastId,
      offset: cursor.offset,
    });
    return {
      list: res.data.data.list,
      minTime: res.data.data.minTime,
      offset: res.data.data.offset,
    };
  },
});
</script>

<template>
  <div class="follow-page" v-loading="loading && posts.length > 0">
    <PageHeader title="我的关注" />

    <SkeletonGrid
      v-if="loading && posts.length === 0"
      :count="FEED_PAGE_SIZE"
    />

    <el-empty v-else-if="posts.length === 0" description="关注的人还没有发帖">
      <el-button type="primary" round @click="$router.push('/home')"
        >去首页逛逛</el-button
      >
    </el-empty>

    <CardGrid v-else :items="posts">
      <template #item="{ item, index }">
        <PostCard :post="item" :delay="index < 12 ? index * 40 : 0" />
      </template>
    </CardGrid>

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
.follow-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}
</style>
