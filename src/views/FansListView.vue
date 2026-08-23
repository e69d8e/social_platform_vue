<script setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { getFollowerListApi, getUserFollowerListApi } from "@/api/followApi";
import { getUserInfoByIdApi } from "@/api/userApi";
import { useUserStore } from "@/stores/user";
import { usePageList } from "@/composables/usePageList";
import UserCard from "@/components/UserCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";

const route = useRoute();
const userStore = useUserStore();

// 被查看用户的昵称，用于标题“XX的粉丝”
const ownerNickname = ref("");

const isMyself = computed(
  () => String(route.params.id) === String(userStore.userInfo.id),
);
const pageTitle = computed(() =>
  isMyself.value ? "我的粉丝" : `${ownerNickname.value || "TA"}的粉丝`,
);

const loadOwnerInfo = async () => {
  try {
    const res = await getUserInfoByIdApi(route.params.id);
    ownerNickname.value = res.data.data?.nickname || "";
  } catch {
    // 拿不到昵称时保留后备标题“TA的粉丝”
    ownerNickname.value = "";
  }
};

const {
  list: fansList,
  pageNum,
  pageSize,
  total,
  loading,
  pageChange,
  reset,
} = usePageList({
  pageSize: 12,
  // 首屏加载由下方 watch(immediate) 统一触发，避免与 onMounted 重复请求
  immediate: false,
  fetchPage: ({ pageNum, pageSize }) => {
    const params = { pageNum, pageSize };
    const req =
      String(route.params.id) === String(userStore.userInfo.id)
        ? getFollowerListApi(params)
        : getUserFollowerListApi(params, route.params.id);
    return req.then((res) => ({
      data: res.data.data,
      total: Number(res.data.total ?? 0),
    }));
  },
});

// 用户id变化时（如从他人主页跳转到另一人的主页）：
// 重新拉取昵称用于标题，并重置分页重新加载
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
    <PageHeader :title="pageTitle" :total="total" unit="人" />

    <SkeletonGrid
      v-if="loading && fansList.length === 0"
      type="user"
      :count="12"
    />

    <el-empty
      v-else-if="fansList.length === 0"
      :description="
        isMyself
          ? '你还没有粉丝，去发布帖子吸引关注吧'
          : `${ownerNickname || 'TA'}还没有粉丝`
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

    <CardGrid v-else :items="fansList">
      <template #item="{ item, index }">
        <UserCard
          :id="item.id"
          :avatar="item.avatar"
          :nickname="item.nickname"
          :bio="item.bio"
          :followed="item.followed"
          :count="item.count"
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
