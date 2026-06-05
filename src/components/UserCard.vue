<script setup>
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { ref, computed } from "vue";
import { throttle } from "lodash";
import { useUserStore } from "@/stores/user";
import formattedCount from "@/utils/formattedCount";
import { ElMessage } from "element-plus";

const props = defineProps({
  id: { type: String, default: "" },
  avatar: { type: String, default: "http://127.0.0.1:8080/imgs/avatar/default.jpg" },
  nickname: { type: String, default: "用户名" },
  bio: { type: String, default: "个性签名" },
  followed: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
});

const followed = ref(props.followed);
const userStore = useUserStore();
const followLoading = ref(false);

const toggleFollow = throttle(async () => {
  if (userStore.userInfo.id === props.id) {
    ElMessage.warning("不能关注自己");
    return;
  }
  if (followLoading.value) return;
  followLoading.value = true;
  const oldFollowed = followed.value;
  followed.value = !followed.value;
  try {
    const res = followed.value ? await followUserApi(props.id) : await unfollowUserApi(props.id);
    if (res.data.code !== 1) throw new Error();
    ElMessage.success(res.data.message);
  } catch {
    followed.value = oldFollowed;
  } finally {
    followLoading.value = false;
  }
}, 800);

const fansCount = computed(() => formattedCount(props.count));
</script>

<template>
  <div class="usercard">
    <el-card shadow="hover" class="card">
      <template #header>
        <div class="card-header">
          <el-avatar :size="44" :src="props.avatar" class="pointer" @click="$router.push(`/user/${props.id}`)" />
          <div class="user-info" @click="$router.push(`/user/${props.id}`)">
            <span class="nickname">{{ props.nickname }}</span>
            <span class="fans-count">{{ fansCount }} 粉</span>
          </div>
          <el-button
            @click.stop="toggleFollow"
            :type="followed ? 'default' : 'primary'"
            size="small"
            class="follow-btn"
          >
            {{ followed ? '已关注' : '关注' }}
          </el-button>
        </div>
      </template>
      <div class="bio pointer" @click="$router.push(`/user/${props.id}`)">
        {{ props.bio }}
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.usercard {
  .card {
    border-radius: $radius-lg;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-sm);
    transition: all $transition-base;

    &:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    :deep(.el-card__header) {
      padding: 14px 16px 8px;
      border-bottom: none;
    }

    :deep(.el-card__body) {
      padding: 0 16px 14px;
    }
  }

  .pointer {
    cursor: pointer;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-info {
    flex: 1;
    min-width: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nickname {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color $transition-base;

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .fans-count {
    font-size: 12px;
    color: var(--el-color-primary);
    font-weight: 500;
  }

  .follow-btn {
    flex-shrink: 0;
    border-radius: $radius-full;
  }

  .bio {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
  }
}
</style>
