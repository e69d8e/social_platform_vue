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
  transition: transform 0.25s ease;

  &:hover {
    transform: translateY(-3px);
  }

  .card {
    border-radius: 10px;
    border-color: var(--el-border-color-light, #e4e7ed);

    :deep(.el-card__header) {
      padding: 12px 14px 8px;
      border-bottom: none;
    }

    :deep(.el-card__body) {
      padding: 0 14px 12px;
    }
  }

  .pointer {
    cursor: pointer;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
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
    font-weight: 500;
    color: var(--el-text-color-primary, #303133);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fans-count {
    font-size: 12px;
    color: var(--el-color-primary, #409eff);
  }

  .follow-btn {
    flex-shrink: 0;
  }

  .bio {
    font-size: 13px;
    color: var(--el-text-color-secondary, #909399);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
  }
}
</style>
