<script setup>
import { ref, onMounted } from "vue";
import { getBanUsersApi } from "@/api/adminApi";
const usersList = ref([]);
const getUsersList = async () => {
  const res = await getBanUsersApi();
  usersList.value = res.data.data;
};
onMounted(async () => {
  await getUsersList();
});
</script>
<template>
  <div class="ban">
    <div class="back" @click="$router.back()">
      <el-icon size="large"><ArrowLeft /></el-icon>
    </div>
    <div class="text">
      <el-text size="large" type="primary">我的封禁</el-text>
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
  </div>
</template>
<style lang="scss" scoped>
.ban {
  padding: 30px 180px;
  .back {
    cursor: pointer;
  }
  .text {
    text-align: center;
    margin-bottom: 10px;
  }
}
</style>
