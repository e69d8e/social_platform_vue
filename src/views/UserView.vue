<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getUserInfoByIdApi } from "@/api/userApi";
const route = useRoute();
const router = useRouter();
console.log(route.params.id);
const userInfo = ref({
  id: "",
  account: "",
  nickname: "",
  avatar: "",
  bio: "",
  followed: false,
  fansPrivate: false,
  followPrivate: false,
  count: 0,
  createTime: "",
  gender: 0,
  authority: "",
});
onMounted(async () => {
  await getUserInfo();
});
const getUserInfo = async () => {
  if (route.params.id == undefined) {
    return;
  }
  const res = await getUserInfoByIdApi(route.params.id);
  userInfo.value = res.data.data;
  console.log(res.data.data);
};
const toFallow = () => {
  router.push({
    path: "/follow/" + route.params.id,
  });
};
const toFans = () => {
  router.push({
    path: "/fans/" + route.params.id,
  });
};
</script>
<template>
  <div class="user">
    <div class="back" @click="$router.back()">
      <el-icon><ArrowLeft size="large" /></el-icon>
    </div>
    <el-avatar
      :src="userInfo.avatar"
      style="width: 80px; height: 80px; border-radius: 50%"
    />
    <!-- <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon> -->
    <div class="account">
      <div class="info" v-if="userInfo.authority === 'USER'">
        <el-text size="large" type="success"
          >账号: {{ userInfo.nickname }}</el-text
        >
      </div>
      <div class="info" v-if="userInfo.authority === 'ADMIN'">
        <el-text size="large" type="danger"
          >账号: {{ userInfo.nickname }}</el-text
        >
      </div>
      <div class="info" v-if="userInfo.authority === 'REVIEWER'">
        <el-text size="large" type="primary"
          >账号: {{ userInfo.nickname }}</el-text
        >
      </div>
    </div>
    <div class="nickname">
      <el-text size="large" type="primary"
        >昵称: {{ userInfo.nickname }}</el-text
      >
    </div>
    <AuthorityBox :authority="userInfo.authority" />
    <div class="count" style="margin: 10px 0">
      <el-text type="primary">{{ userInfo.count }} 粉丝</el-text>
    </div>
    <div class="gender">
      <el-text type="primary" v-if="userInfo.gender === 1"
        >性别: <el-icon><Male /></el-icon
      ></el-text>
      <el-text type="primary" v-else-if="userInfo.gender === 2"
        >性别: <el-icon><Female /></el-icon
      ></el-text>
      <el-text type="primary" v-else>性别: 未知</el-text>
    </div>
    <div class="private">
      <el-button @click="toFallow" type="success" v-if="!userInfo.followPrivate"
        >ta的关注</el-button
      >
      <el-button @click="toFans" type="primary" v-if="!userInfo.fansPrivate"
        >ta的粉丝</el-button
      >
      <el-button
        type="warning"
        @click="
          $router.push({
            path: '/postList/' + route.params.id,
          })
        "
        >ta的帖子</el-button
      >
    </div>
    <div class="bio">
      <el-text type="primary">简介: {{ userInfo.bio }}</el-text>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.user {
  margin: 30px auto;
  width: 400px;
  text-align: center;
  .back {
    height: 30px;
    display: flex;
    justify-content: flex-start;
  }
  .back {
    cursor: pointer;
  }
  .info {
    margin: 20px 0;
  }
  .nickname {
    margin: 20px 0;
  }
  .count {
    margin: 20px 0;
  }
  .private {
    margin: 20px 0;
  }
}
</style>
