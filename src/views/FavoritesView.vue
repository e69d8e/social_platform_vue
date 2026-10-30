<script setup>
import { watch } from "vue";
import { useRoute } from "vue-router";
import { getStarListApi } from "@/api/starApi";
import { usePageList } from "@/composables/usePageList";
import { POST_PAGE_SIZE } from "@/constants/pagination";
import PostCard from "@/components/PostCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import LoadStatus from "@/components/LoadStatus.vue";
import { CollectionTag } from "@element-plus/icons-vue";

const route = useRoute();

const {
  list: starList,
  pageNum,
  pageSize,
  total,
  loading,
  isError,
  pageChange,
  reset,
  retry,
} = usePageList({
  pageSize: POST_PAGE_SIZE,
  immediate: false,
  fetchPage: ({ pageNum, pageSize }) =>
    getStarListApi({ pageNum, pageSize }).then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    })),
});

// 我的收藏按登录用户隔离，登录态变化时重载
watch(
  () => route.fullPath,
  () => reset(),
  { immediate: true },
);
</script>

<template>
  <div class="favorites-page" v-loading="loading && starList.length > 0">
    <PageHeader title="我的收藏" :total="total" unit="篇">
      <template #extra>
        <span class="header-hint">
          <el-icon :size="14"><CollectionTag /></el-icon>
          收藏的帖子会保存在这里，仅自己可见
        </span>
      </template>
    </PageHeader>

    <SkeletonGrid
      v-if="loading && starList.length === 0"
      :count="POST_PAGE_SIZE"
    />

    <LoadStatus
      v-else-if="isError"
      :is-error="true"
      :has-items="false"
      @retry="retry"
    />

    <el-empty
      v-else-if="starList.length === 0"
      description="还没有收藏任何帖子"
    >
      <el-button type="primary" round @click="$router.push('/home')"
        >去首页逛逛</el-button
      >
    </el-empty>

    <CardGrid v-else :items="starList">
      <template #item="{ item, index }">
        <PostCard :post="item" :delay="index < 12 ? index * 40 : 0" />
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
.favorites-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .header-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--text-placeholder);
  }
}
</style>
