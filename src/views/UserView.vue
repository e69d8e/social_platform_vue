<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getUserInfoByIdApi } from "@/api/userApi";
import { useUserStore } from "@/stores/user";
import { banUserApi, setReviewerApi, setUserApi } from "@/api/adminApi";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { throttle } from "lodash";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import formattedCount from "@/utils/formattedCount";
import { ArrowLeft, Male, Female, Warning } from "@element-plus/icons-vue";
// import { ElMessage } from "element-plus";

const route = useRoute();
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

const getUserInfo = async () => {
  if (!route.params.id) return;
  const res = await getUserInfoByIdApi(route.params.id);
  userInfo.value = res.data.data;
};

onMounted(async () => {
  await getUserInfo();
  loading.value = false;
});

const followLoading = ref(false);
const toggleFollow = throttle(async () => {
  if (userStore.userInfo.id === userInfo.value.id) {
    ElMessage.warning("不能关注自己");
    return;
  }
  if (followLoading.value) return;
  followLoading.value = true;
  const oldFollowed = userInfo.value.followed;
  userInfo.value.followed = !oldFollowed;
  try {
    const api = oldFollowed ? unfollowUserApi : followUserApi;
    const res = await api(userInfo.value.id);
    if (res.data.code !== 1) throw new Error(res.data.message || "操作失败");
    ElMessage.success(res.data.message);
  } catch (e) {
    userInfo.value.followed = oldFollowed;
    ElMessage.error(e.message || "操作失败，请重试");
  } finally {
    followLoading.value = false;
  }
}, 800);

const ban = async () => {
  const res = await banUserApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.enabled = !userInfo.value.enabled;
    ElMessage.success(res.data.message);
  }
};

const setUser = async () => {
  const res = await setUserApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.authorityId = 1;
    ElMessage.success(res.data.message);
  }
};

const setReviewer = async () => {
  const res = await setReviewerApi(route.params.id);
  if (res.data.code === 1) {
    userInfo.value.authorityId = 3;
    ElMessage.success(res.data.message);
  }
};

const fansCount = computed(() => formattedCount(userInfo.value.count));

const authorityType = computed(() => {
  const map = { 1: "success", 2: "danger", 3: "primary" };
  return map[userInfo.value.authorityId] || "info";
});

const genderLabel = computed(() => {
  if (userInfo.value.gender === 1) return "男";
  if (userInfo.value.gender === 2) return "女";
  return "未知";
});
</script>

<template>
  <div class="user-page" v-loading="loading">
    <div class="back" @click="$router.back()">
      <el-icon size="18"><ArrowLeft /></el-icon>
      <span>返回</span>
    </div>

    <div class="user-card">
      <el-avatar :src="userInfo.avatar" :size="88" class="avatar" />

      <div class="user-meta">
        <div class="meta-item">
          <span class="meta-label">昵称</span>
          <h3 class="nickname">{{ userInfo.nickname }}</h3>
        </div>
        <div class="meta-item">
          <span class="meta-label">账号</span>
          <el-text :type="authorityType" size="small">@{{ userInfo.username }}</el-text>
        </div>
        <div class="meta-item">
          <span class="meta-label">角色</span>
          <AuthorityComponent :authority-id="userInfo.authorityId" />
        </div>
      </div>

      <div v-if="!userInfo.enabled" class="banned-badge">
        <el-icon><Warning /></el-icon>
        <span>该账号已被封禁</span>
      </div>

      <div class="follow-action">
        <el-button
          @click="toggleFollow"
          :type="userInfo.followed ? 'default' : 'primary'"
        >
          {{ userInfo.followed ? "已关注" : "关注" }}
        </el-button>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="label">粉丝</span>
          <span class="value">{{ fansCount }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别</span>
          <span class="value">
            <el-icon v-if="userInfo.gender === 1"><Male /></el-icon>
            <el-icon v-else-if="userInfo.gender === 2"><Female /></el-icon>
            {{ genderLabel }}
          </span>
        </div>
        <div class="info-item">
          <span class="label">注册时间</span>
          <span class="value">{{ userInfo.createTime }}</span>
        </div>
      </div>

      <div v-if="userInfo.bio" class="bio">
        <span class="label">简介</span>
        <p>{{ userInfo.bio }}</p>
      </div>

      <div class="actions">
        <el-button
          v-if="!userInfo.followPrivate"
          type="success"
          size="small"
          @click="$router.push('/follow/' + route.params.id)"
          >Ta 的关注</el-button
        >
        <el-button
          v-if="!userInfo.fansPrivate"
          type="primary"
          size="small"
          @click="$router.push('/fans/' + route.params.id)"
          >Ta 的粉丝</el-button
        >
        <el-button
          type="warning"
          size="small"
          @click="$router.push('/postList/' + route.params.id)"
          >Ta 的帖子</el-button
        >
      </div>

      <div v-if="userStore.userInfo.authorityId === 2" class="admin-actions">
        <el-popconfirm
          v-if="userInfo.authorityId === 1"
          title="确认将该用户设为审核吗？"
          @confirm="setReviewer"
        >
          <template #reference>
            <el-button type="primary" size="small">设为审核</el-button>
          </template>
        </el-popconfirm>
        <el-button
          v-else-if="userInfo.authorityId === 3"
          type="info"
          size="small"
          @click="setUser"
          >设为普通用户</el-button
        >

        <el-popconfirm
          v-if="userInfo.enabled"
          title="确认封禁该用户吗？"
          @confirm="ban"
        >
          <template #reference>
            <el-button type="danger" size="small">封禁该用户</el-button>
          </template>
        </el-popconfirm>
        <el-button v-else type="info" size="small" @click="ban"
          >解封该用户</el-button
        >
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 16px 40px;

  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--el-text-color-regular, #606266);
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    margin-bottom: 20px;
    &:hover {
      color: var(--el-color-primary, #409eff);
      background: var(--el-color-primary-light-9, #ecf5ff);
    }
  }
}

.user-card {
  text-align: center;
  background: var(--el-bg-color, #ffffff);
  border-radius: 16px;
  padding: 36px 24px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .avatar {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: 14px 0 8px;

    .meta-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .meta-label {
      font-size: 11px;
      color: var(--el-text-color-placeholder, #a8abb2);
    }
  }

  .nickname {
    font-size: 20px;
    font-weight: 700;
    color: var(--el-text-color-primary, #303133);
    margin: 0;
  }

  .banned-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--el-color-danger, #f56c6c);
    font-size: 14px;
    margin: 10px 0;
  }

  .follow-action {
    margin: 16px 0;
  }

  .info-grid {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin: 20px 0;
    padding: 16px 0;
    border-top: 1px solid var(--el-border-color-light, #e4e7ed);
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 12px;
        color: var(--el-text-color-secondary, #909399);
      }

      .value {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary, #303133);
        display: flex;
        align-items: center;
        gap: 2px;
      }
    }
  }

  .bio {
    text-align: left;
    margin: 16px 0;
    padding: 12px 16px;
    background: var(--el-bg-color-page, #f2f3f5);
    border-radius: 8px;

    .label {
      font-size: 12px;
      color: var(--el-text-color-secondary, #909399);
    }

    p {
      margin: 6px 0 0;
      font-size: 14px;
      color: var(--el-text-color-regular, #606266);
      line-height: 1.6;
    }
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 16px 0;
  }

  .admin-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light, #e4e7ed);
  }
}
</style>
