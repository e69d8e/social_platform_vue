<script setup>
import PostCard from "@/components/PostCard.vue";
import CategoryComponent from "@/components/CategoryComponent.vue";
import CardGrid from "@/components/CardGrid.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import { getIndexPostsApi } from "@/api/postApi";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";

const { items: posts, loading, loadingMore, noMore } = useInfiniteScroll({
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
  <div class="home" v-loading="loading">
    <div class="category">
      <CategoryComponent />
    </div>

    <CardGrid :items="posts">
      <template #item="{ item }">
        <PostCard
          :id="item.id"
          :img-url="item.imgUrl"
          :title="item.title"
          :content="item.content"
          :like-count="item.likeCount"
          :liked="item.liked"
          :time="item.createTime"
          :cover="item.cover"
          :view-count="item.viewCount"
        />
      </template>
    </CardGrid>

    <LoadStatus :loading="loadingMore" :no-more="noMore" :has-items="posts.length > 0" />
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
}
</style>
