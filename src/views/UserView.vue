<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getUserInfoByIdApi } from "@/api/userApi";
import { useUserStore } from "@/stores/user";
import { banUserApi, setReviewerApi, setUserApi } from "@/api/adminApi";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { throttle } from "lodash";
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const userInfo = ref({
  id: "",
  username: "",
  nickname: "",
  avatar: "",
  bio: "",
  followed: false,
  fansPrivate: false,
  followPrivate: false,
  count: 0,
  createTime: "",
  gender: 0,
  authorityId: 1,
  enabled: true,
});
const loading = ref(true);
onMounted(async () => {
  await getUserInfo();
  loading.value = false;
});
const getUserInfo = async () => {
  if (route.params.id == undefined) {
    return;
  }
  const res = await getUserInfoByIdApi(route.params.id);
  userInfo.value = res.data.data;
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

const followLoading = ref(false);

const toggleFollow = throttle(async () => {
  // 不能关注自己
  if (userStore.userInfo.id === userInfo.value.id) {
    // eslint-disable-next-line no-undef
    ElMessage.warning("不能关注自己");
    return;
  }

  // 防并发
  if (followLoading.value) return;
  followLoading.value = true;

  // 记录旧状态（回滚用）
  const oldFollowed = userInfo.value.followed;

  // 乐观更新（UI先变）
  const nextFollowed = !oldFollowed;
  userInfo.value.followed = nextFollowed;

  try {
    // 用“旧状态”判断接口（更安全）
    const api = oldFollowed ? unfollowUserApi : followUserApi;
    const res = await api(userInfo.value.id);

    if (res.data.code !== 1) {
      throw new Error(res.data.message || "操作失败");
    }

    // eslint-disable-next-line no-undef
    ElMessage.success(res.data.message);
  } catch (e) {
    // 回滚
    userInfo.value.followed = oldFollowed;

    console.error(e);
    // eslint-disable-next-line no-undef
    ElMessage.error(e.message || "操作失败，请重试");
  } finally {
    followLoading.value = false;
  }
}, 800);
const ban = async () => {
  const res = await banUserApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.enabled = !userInfo.value.enabled;
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
};
const setUser = async () => {
  const res = await setUserApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.authorityId = 1;
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
};
const setReviewer = async () => {
  const res = await setReviewerApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.authorityId = 3;
    // eslint-disable-next-line no-undef
    ElMessage({
      message: res.data.message,
      type: "success",
    });
  }
};
</script>
<template>
  <div class="user" v-loading="loading">
    <div class="back" @click="$router.back()">
      <el-icon><ArrowLeft size="large" /></el-icon>
    </div>
    <el-avatar
      :src="userInfo.avatar"
      style="width: 80px; height: 80px; border-radius: 50%"
    />
    <div class="count" style="margin: 10px 0">
      <el-text type="primary">{{ userInfo.count }} 粉丝</el-text>
    </div>
    <div class="follow">
      <el-button @click="toggleFollow" v-if="!userInfo.followed" type="primary"
        >关注</el-button
      >
      <el-button @click="toggleFollow" v-else>已关注</el-button>
    </div>
    <div class="account">
      <div class="info" v-if="userInfo.authorityId === 1">
        <el-text size="large" type="success"
          >账号: {{ userInfo.username }}</el-text
        >
      </div>
      <div class="info" v-if="userInfo.authorityId === 2">
        <el-text size="large" type="danger"
          >账号: {{ userInfo.username }}</el-text
        >
      </div>
      <div class="info" v-if="userInfo.authorityId === 3">
        <el-text size="large" type="primary"
          >账号: {{ userInfo.username }}</el-text
        >
      </div>
    </div>
    <div class="nickname">
      <el-text size="large" type="primary"
        >昵称: {{ userInfo.nickname }}</el-text
      >
    </div>
    <div class="enabled" v-if="!userInfo.enabled">
      <el-text type="danger"
        ><el-icon><Warning /></el-icon>该账号封禁中</el-text
      >
    </div>
    <AuthorityBox :authorityId="userInfo.authorityId" />
    <div class="createTime">
      <el-text type="primary">注册时间: {{ userInfo.createTime }}</el-text>
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
    <div class="bio">
      <el-text type="primary">简介: {{ userInfo.bio }}</el-text>
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
    <div class="set" v-if="userStore.userInfo.authority === 'ADMIN'">
      <el-popconfirm
        v-if="userInfo.authorityId === 1"
        class="box-item"
        title="确认将该用户设为审核吗？"
        placement="right-end"
        @confirm="setReviewer"
      >
        <template #reference>
          <el-button type="primary">设为审核</el-button>
        </template>
      </el-popconfirm>
      <el-button
        @click="setUser"
        v-else-if="userInfo.authorityId === 3"
        type="info"
        >设为普通用户</el-button
      >
    </div>
    <div class="ban" v-if="userStore.userInfo.authorityId === 2">
      <el-popconfirm
        v-if="userInfo.enabled"
        class="box-item"
        title="确认封禁该用户吗？"
        placement="right-end"
        @confirm="ban"
      >
        <template #reference>
          <el-button type="danger">封禁该用户</el-button>
        </template>
      </el-popconfirm>
      <el-button @click="ban" v-else type="info">解封该用户</el-button>
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
  .follow {
    margin: 20px 0;
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
  .enabled {
    margin: 20px 0;
  }
  .createTime {
    margin: 20px 0;
  }
  .count {
    margin: 20px 0;
  }
  .ban {
    margin: 20px 0;
  }
  .bio {
    margin: 20px 0;
  }
  .private {
    margin: 20px 0;
  }
}
</style>
