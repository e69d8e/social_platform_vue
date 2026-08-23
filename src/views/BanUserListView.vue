<script setup>
import { ref } from "vue";
import { getBanUsersApi, searchBanUsersApi } from "@/api/adminApi";
import { usePageList } from "@/composables/usePageList";
import UserCard from "@/components/UserCard.vue";
import SkeletonGrid from "@/components/SkeletonGrid.vue";
import PageHeader from "@/components/PageHeader.vue";
import CardGrid from "@/components/CardGrid.vue";
import ListPagination from "@/components/ListPagination.vue";
import SearchInput from "@/components/SearchInput.vue";

const keyword = ref("");

const {
  list: usersList,
  pageNum,
  pageSize,
  total,
  loading,
  pageChange,
  reset,
} = usePageList({
  pageSize: 12,
  fetchPage: ({ pageNum, pageSize }) => {
    const params = { pageNum, pageSize };
    const kw = keyword.value.trim();
    const req = kw
      ? searchBanUsersApi({ ...params, keyword: kw })
      : getBanUsersApi(params);
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
    <PageHeader title="已封禁用户" :total="total" unit="人" />

    <SearchInput
      v-model="keyword"
      placeholder="搜索封禁用户..."
      @search="handleSearch"
    />

    <SkeletonGrid
      v-if="loading && usersList.length === 0"
      type="user"
      :count="12"
    />

    <el-empty v-else-if="usersList.length === 0" description="暂无封禁用户" />

    <CardGrid v-else :items="usersList">
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
