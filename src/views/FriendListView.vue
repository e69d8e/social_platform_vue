<script setup>
import { getFriendListApi } from "@/api/followApi";
import { usePageList } from "@/composables/usePageList";
import UserCard from "@/components/UserCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";

const {
  list: friendList,
  pageNum,
  pageSize,
  total,
  loading,
  pageChange,
} = usePageList({
  pageSize: 12,
  fetchPage: ({ pageNum, pageSize }) =>
    getFriendListApi({ pageNum, pageSize }).then((res) => ({
      data: res.data.data,
      total: res.data.total,
    })),
});
</script>

<template>
  <div class="list-page" v-loading="loading">
    <PageHeader title="好友列表" :total="total" unit="人" />

    <SkeletonGrid
      v-if="loading && friendList.length === 0"
      type="user"
      :count="12"
    />

    <el-empty v-else-if="friendList.length === 0" description="暂无好友">
      <el-button type="primary" round @click="$router.push('/home')"
        >去首页逛逛</el-button
      >
    </el-empty>

    <CardGrid v-else :items="friendList">
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
