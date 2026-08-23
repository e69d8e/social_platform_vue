<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { getPostListApi } from "@/api/postApi";
import { getUserInfoByIdApi } from "@/api/userApi";
import { usePageList } from "@/composables/usePageList";
import PostCard from "@/components/PostCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";

const route = useRoute();
const userStore = useUserStore();

// 被查看用户的昵称，用于标题“XX的帖子”
const ownerNickname = ref("");

const isMyself = computed(
  () => String(userStore.userInfo.id) === String(route.params.id),
);
const pageTitle = computed(() =>
  isMyself.value ? "我的帖子" : `${ownerNickname.value || "TA"}的帖子`,
);

const loadOwnerInfo = async () => {
  try {
    const res = await getUserInfoByIdApi(route.params.id);
    ownerNickname.value = res.data.data?.nickname || "";
  } catch {
    // 拿不到昵称时保留后备标题“TA的帖子”
    ownerNickname.value = "";
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
  // 首屏加载由下方 watch(immediate) 统一触发，避免与 onMounted 重复请求
  immediate: false,
  fetchPage: ({ pageNum, pageSize }) =>
    getPostListApi(route.params.id, { pageNum, pageSize }).then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    })),
});

// 用户id变化时（如从他人主页跳转到另一人的主页）：
// 重新拉取昵称用于标题，并重置分页重新加载帖子
watch(
  () => route.params.id,
  () => {
    loadOwnerInfo();
    reset();
  },
  { immediate: true },
);
</script>

<template>
  <div class="list-page" v-loading="loading">
    <PageHeader :title="pageTitle" :total="total" unit="篇" />

    <SkeletonGrid v-if="loading && postList.length === 0" :count="8" />

    <el-empty
      v-else-if="postList.length === 0"
      :description="
        isMyself
          ? '你还没有发布过帖子'
          : `${ownerNickname || 'TA'}还没有发布帖子`
      "
    >
      <el-button
        v-if="isMyself"
        type="primary"
        round
        @click="$router.push('/publicPost')"
        >去发布</el-button
      >
    </el-empty>

    <CardGrid v-else :items="postList">
      <template #item="{ item, index }">
        <PostCard
          :id="item.id"
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
