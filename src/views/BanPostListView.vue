<script setup>
import { ref } from "vue";
import { getBanPostsApi, searchBanPostsApi } from "@/api/reviewerApi";
import { usePageList } from "@/composables/usePageList";
import PostCard from "@/components/PostCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import SearchInput from "@/components/SearchInput.vue";

const keyword = ref("");

const {
  list: postList,
  pageNum,
  pageSize,
  total,
  loading,
  pageChange,
  reset,
} = usePageList({
  pageSize: 8,
  fetchPage: ({ pageNum, pageSize }) => {
    const params = { pageNum, pageSize };
    const kw = keyword.value.trim();
    const req = kw
      ? searchBanPostsApi({ ...params, keyword: kw })
      : getBanPostsApi(params);
    return req.then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    }));
  },
});

const handleSearch = () => reset();
</script>

<template>
  <div class="list-page" v-loading="loading">
    <PageHeader title="已封禁帖子" :total="total" unit="篇" />

    <SearchInput
      v-model="keyword"
      placeholder="搜索封禁帖子..."
      @search="handleSearch"
    />

    <SkeletonGrid v-if="loading && postList.length === 0" :count="8" />

    <el-empty v-else-if="postList.length === 0" description="暂无封禁帖子" />

    <CardGrid v-else :items="postList">
      <template #item="{ item, index }">
        <PostCard
          :id="item.id"
          :user-id="item.userId"
          :username="item.username"
          :title="item.title"
          :cover="item.cover"
          :content="item.content"
          :liked="item.liked"
          :like-count="item.likeCount"
          :time="item.createTime"
          :view-count="item.viewCount"
          :delay="index < 12 ? index * 40 : 0"
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
