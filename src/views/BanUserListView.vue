<script setup>
import { ref, onMounted } from "vue";
import { getBanUsersApi } from "@/api/adminApi";
import UserCard from "@/components/UserCard.vue";
import { ArrowLeft } from "@element-plus/icons-vue";

const usersList = ref([]);
const pageNum = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(true);

const getUsersList = async () => {
  const res = await getBanUsersApi({ pageNum: pageNum.value, pageSize: pageSize.value });
  usersList.value = res.data.data;
  total.value = res.data.total;
};

onMounted(async () => {
  await getUsersList();
  loading.value = false;
});

const pageChange = async (newPage) => {
  pageNum.value = newPage;
  loading.value = true;
  await getUsersList();
  loading.value = false;
};
</script>

<template>
  <div class="list-page" v-loading="loading">
    <div class="page-header">
      <div class="back" @click="$router.back()">
        <el-icon size="18"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <span class="page-title">已封禁用户</span>
      <span class="total-count">共 {{ total }} 人</span>
    </div>

    <el-empty v-if="usersList.length === 0 && !loading" description="暂无封禁用户" />

    <el-row v-else :gutter="16" class="result-grid">
      <el-col v-for="user in usersList" :key="user.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
        <UserCard :id="user.id" :avatar="user.avatar" :nickname="user.nickname" :bio="user.bio" :followed="user.followed" :count="user.count" />
      </el-col>
    </el-row>

    <div v-if="total > pageSize" class="pagination">
      <el-pagination @current-change="pageChange" :total="total" v-model:current-page="pageNum" :page-size="pageSize" background layout="prev, pager, next" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 4px 16px;
    .back {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: var(--el-text-color-regular, #606266);
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
      &:hover {
        color: var(--el-color-primary, #409eff);
        background: var(--el-color-primary-light-9, #ecf5ff);
      }
    }
    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary, #303133);
    }
    .total-count {
      font-size: 13px;
      color: var(--el-text-color-secondary, #909399);
    }
  }

  .result-grid {
    margin-left: 0 !important;
    margin-right: 0 !important;
    :deep(.el-col) { margin-bottom: 16px; }
  }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 16px 0 8px;
  }
}
</style>
