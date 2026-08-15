<script setup>
import { useRoute } from "vue-router";
import { searchPostsApi } from "@/api/searchApi";
import { usePageList } from "@/composables/usePageList";
import PostCard from "@/components/PostCard.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";

const route = useRoute();

const { list: postList, pageNum, pageSize, total, loading, pageChange } =
  usePageList({
    pageSize: 8,
    fetchPage: ({ pageNum, pageSize }) =>
      searchPostsApi({
        pageNum,
        pageSize,
        categoryId: route.params.id,
      }).then((res) => ({ data: res.data.data, total: res.data.total })),
  });
</script>

<template>
  <div class="list-page" v-loading="loading">
    <PageHeader :title="route.query.category" :total="total" unit="篇" />

    <el-empty
      v-if="postList.length === 0 && !loading"
      description="该分类暂无帖子"
    />

    <CardGrid v-else :items="postList">
      <template #item="{ item }">
        <PostCard
          :id="item.id"
          :img-url="item.imgUrl"
          :title="item.title"
          :cover="item.cover"
          :content="item.content"
          :liked="item.liked"
          :like-count="item.likeCount"
          :time="item.createTime"
          :view-count="item.viewCount"
        />
      </template>
    </CardGrid>

    <ListPagination
      v-model:page-num="pageNum"
      :total="total"
      :page-size="pageSize"
      @change="pageChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;
}
</style>
