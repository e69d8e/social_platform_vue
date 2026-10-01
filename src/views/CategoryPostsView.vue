<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { searchPostsApi } from "@/api/searchApi";
import { getPostCategoryApi } from "@/api/postApi";
import { usePageList } from "@/composables/usePageList";
import PostCard from "@/components/PostCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";

const route = useRoute();

// 标题：优先取跳转时携带的分类名；直链/刷新时回退为「全部分类」里按 id 反查
const categoryName = ref("");
const pageTitle = computed(
  () => route.query.category || categoryName.value || "分类帖子",
);

const resolveCategoryName = async () => {
  if (route.query.category) return;
  try {
    const res = await getPostCategoryApi();
    const hit = (res.data.data || []).find(
      (c) => String(c.id) === String(route.params.id),
    );
    categoryName.value = hit?.name || "";
  } catch {
    categoryName.value = "";
  }
};

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
  fetchPage: ({ pageNum, pageSize }) =>
    searchPostsApi({
      pageNum,
      pageSize,
      categoryId: route.params.id,
    }).then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    })),
});

// 同路由换分类参数时重置分页并重新解析标题
watch(
  () => route.params.id,
  () => {
    categoryName.value = "";
    resolveCategoryName();
    reset();
  },
  { immediate: true },
);
</script>

<template>
  <div class="list-page" v-loading="loading && postList.length > 0">
    <PageHeader :title="pageTitle" :total="total" unit="篇" />

    <SkeletonGrid v-if="loading && postList.length === 0" :count="8" />

    <el-empty v-else-if="postList.length === 0" description="该分类暂无帖子">
      <el-button type="primary" round @click="$router.push('/home')"
        >回首页看看其他分类</el-button
      >
    </el-empty>

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
