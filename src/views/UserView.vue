<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { getUserInfoByIdApi } from "@/api/userApi";
import { useUserStore } from "@/stores/user";
import { banUserApi, setReviewerApi, setUserApi } from "@/api/adminApi";
import AuthorityComponent from "@/components/AuthorityComponent.vue";
import PageHeader from "@/components/PageHeader.vue";
import FollowButton from "@/components/FollowButton.vue";
import formattedCount from "@/utils/formattedCount";
import { Male, Female, Warning } from "@element-plus/icons-vue";

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
  fansCount: 0,
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
  try {
    await getUserInfo();
  } finally {
    loading.value = false;
  }
});

// 统一转字符串比较，避免后端返回 id 数字/字符串不一致导致误判
const isSelf = computed(
  () => String(userStore.userInfo.id) === String(userInfo.value.id),
);

const banLoading = ref(false);
const ban = async () => {
  banLoading.value = true;
  try {
    const res = await banUserApi(route.params.id);
    if (res.data.code === 1) {
      userInfo.value.enabled = !userInfo.value.enabled;
      ElMessage.success(res.data.message);
    }
  } finally {
    banLoading.value = false;
  }
};

const roleLoading = ref(false);
const setRole = async (api, targetRole) => {
  roleLoading.value = true;
  try {
    const res = await api(route.params.id);
    if (res.data.code === 1) {
      userInfo.value.authorityId = targetRole;
      ElMessage.success(res.data.message);
    }
  } finally {
    roleLoading.value = false;
  }
};
const setUser = () => setRole(setUserApi, 1);
const setReviewer = () => setRole(setReviewerApi, 3);

const fansCount = computed(() => formattedCount(userInfo.value.fansCount));

const authorityType = computed(() => {
  const map = { 1: "success", 2: "danger", 3: "primary" };
  return map[userInfo.value.authorityId] || "info";
});

const genderLabel = computed(() => {
  if (userInfo.value.gender === 1) return "男";
  if (userInfo.value.gender === 2) return "女";
  return "未知";
});

const formattedCreateTime = computed(() => {
  const t = userInfo.value.createTime;
  if (!t) return "—";
  const parts = String(t).split(" ");
  return parts[0] || String(t);
});
</script>

<template>
  <div class="user-page" v-loading="loading">
    <PageHeader title="个人主页" large />

    <div class="user-card">
      <el-avatar :src="userInfo.avatar" :size="88" class="avatar" />

      <div class="user-meta">
        <h3 class="nickname">{{ userInfo.nickname || "未设置昵称" }}</h3>
        <el-text :type="authorityType" size="small"
          >@{{ userInfo.username }}</el-text
        >
        <AuthorityComponent :authority-id="userInfo.authorityId" />
      </div>

      <div v-if="!userInfo.enabled" class="banned-badge">
        <el-icon><Warning /></el-icon>
        <span>该账号已被封禁</span>
      </div>

      <div v-if="!isSelf" class="follow-action">
        <FollowButton :user-id="userInfo.id" :followed="userInfo.followed" />
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
          <span class="value">{{ formattedCreateTime }}</span>
        </div>
      </div>

      <div v-if="userInfo.bio" class="bio">
        <span class="label">简介</span>
        <p>{{ userInfo.bio }}</p>
      </div>

      <div class="actions">
        <el-button
          v-if="!isSelf"
          type="primary"
          plain
          size="small"
          @click="$router.push('/chat/new?receiverId=' + route.params.id)"
          >发私信</el-button
        >
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
            <el-button type="primary" size="small" :loading="roleLoading"
              >设为审核</el-button
            >
          </template>
        </el-popconfirm>
        <el-popconfirm
          v-else-if="userInfo.authorityId === 3"
          title="确认将该用户设为普通用户吗？"
          @confirm="setUser"
        >
          <template #reference>
            <el-button type="info" size="small" :loading="roleLoading"
              >设为普通用户</el-button
            >
          </template>
        </el-popconfirm>

        <el-popconfirm
          v-if="userInfo.enabled"
          title="确认封禁该用户吗？"
          @confirm="ban"
        >
          <template #reference>
            <el-button type="danger" size="small" :loading="banLoading"
              >封禁该用户</el-button
            >
          </template>
        </el-popconfirm>
        <el-popconfirm v-else title="确认解封该用户吗？" @confirm="ban">
          <template #reference>
            <el-button type="info" size="small" :loading="banLoading"
              >解封该用户</el-button
            >
          </template>
        </el-popconfirm>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 16px 40px;
}

.user-card {
  text-align: center;
  background: var(--bg-card);
  border-radius: $radius-xl;
  padding: 36px 24px 28px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-light);

  .avatar {
    box-shadow: var(--shadow-md);
    border: 3px solid transparent;
    background-image: var(--gradient-primary);
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 14px 0 8px;
  }

  .nickname {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .banned-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--el-color-danger);
    font-size: 14px;
    margin: 10px 0;
    padding: 4px 12px;
    background: var(--el-color-danger-light-9);
    border-radius: var(--radius-full);
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
    border-top: 1px solid var(--border-light);
    border-bottom: 1px solid var(--border-light);

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .value {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
      }
    }
  }

  .bio {
    text-align: left;
    margin: 16px 0;
    padding: 12px 16px;
    background: var(--bg-subtle);
    border-radius: var(--radius-md);

    .label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    p {
      margin: 6px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 16px 0;

    :deep(.el-button) {
      border-radius: var(--radius-full);
    }
  }

  .admin-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border-light);
  }
}

@media (max-width: 640px) {
  .user-page {
    padding: 10px 8px 36px;
  }

  .user-card {
    padding: 24px 14px 20px;
    border-radius: var(--radius-lg);

    .info-grid {
      gap: 10px;
      padding: 12px 0;
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;

      :deep(.el-button) {
        width: 100%;
        margin: 0 !important;
      }
    }

    .admin-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;

      :deep(.el-button) {
        width: 100%;
        margin: 0 !important;
      }
    }
  }
}
</style>
