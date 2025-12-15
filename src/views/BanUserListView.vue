<script setup>
import { ref, onMounted } from "vue";
import { getBanUsersApi } from "@/api/adminApi";
const usersList = ref([]);
const pageNum = ref(1);
const pageSize = ref(12);
const total = ref(0);
const loading = ref(true);
const getUsersList = async () => {
  const res = await getBanUsersApi({
    pageNum: pageNum.value,
    pageSize: pageSize.value,
  });
  usersList.value = res.data.data;
  total.value = res.data.total;
};
onMounted(async () => {
  await getUsersList();
  loading.value = false;
});
const pageChange = async () => {
  loading.value = true;
  await getUsersList();
  loading.value = false;
};
</script>
<template>
  <div class="ban" v-loading="loading">
    <div class="back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <div class="text">
      <el-text size="large" type="primary">已经封禁用户</el-text>
    </div>
    <el-row>
      <el-col
        class="colItem"
        v-for="user in usersList"
        :key="user.id"
        :span="6"
      >
        <UserCard
          class="postCard"
          :id="user.id"
          :avatar="user.avatar"
          :nickname="user.nickname"
          :bio="user.bio"
          :followed="user.followed"
          :count="user.count"
        />
      </el-col>
    </el-row>

    <div class="pagination">
      <el-pagination
        @current-change="pageChange"
        :total="total"
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        size="large"
        background
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>
<style lang="scss" scoped>
.ban {
  padding: 30px 180px;
  .colItem {
    margin-bottom: 10px;
  }
  .back {
    cursor: pointer;
  }
  .text {
    text-align: center;
    margin-bottom: 20px;
  }
  .pagination {
    position: fixed;
    bottom: 20px; /* 距离底部的距离 */
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000; /* 确保在最上层 */
    background: white; /* 可选：添加背景色 */
    padding: 10px;
    border-radius: 8px; /* 可选：圆角 */
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 可选：阴影效果 */
  }
}
</style>
