<script setup>
import { computed } from "vue";
import FollowButton from "@/components/FollowButton.vue";
import formattedCount from "@/utils/formattedCount";
import { baseURL } from "@/utils/request";

const props = defineProps({
  id: { type: String, default: "" },
  avatar: {
    type: String,
    default: `${baseURL.replace("/api", "")}/imgs/avatar/default.jpg`,
  },
  nickname: { type: String, default: "用户名" },
  bio: { type: String, default: "个性签名" },
  followed: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  // 入场动画延迟（ms），列表网格用它做级联错峰
  delay: { type: Number, default: 0 },
});

const fansCount = computed(() => formattedCount(props.count));
</script>

<template>
  <div class="usercard" :style="{ '--rise-delay': `${props.delay}ms` }">
    <el-card shadow="hover" class="card">
      <template #header>
        <div class="card-header">
          <el-avatar
            :size="44"
            :src="props.avatar"
            class="pointer"
            @click="$router.push(`/user/${props.id}`)"
          />
          <div class="user-info" @click="$router.push(`/user/${props.id}`)">
            <span class="nickname">{{ props.nickname }}</span>
            <span class="fans-count">{{ fansCount }} 粉</span>
          </div>
          <FollowButton
            :user-id="props.id"
            :followed="props.followed"
            size="small"
          />
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
  height: 100%;
  animation: fadeInUp 0.4s ease both;
  animation-delay: var(--rise-delay, 0ms);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

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

    :deep(.el-avatar) {
      flex-shrink: 0;
      border: 2px solid transparent;
      // 双背景渐变环：padding-box 打底（盖住图片底）+ border-box 画渐变环
      background-image:
        linear-gradient(var(--bg-card), var(--bg-card)), var(--gradient-primary);
      background-origin: padding-box, border-box;
      background-clip: padding-box, border-box;
      transition: transform $transition-base;

      &:hover {
        transform: scale(1.06);
      }
    }
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
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .bio {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@media (max-width: 640px) {
  .usercard .card {
    border-radius: $radius-md;

    :deep(.el-card__header) {
      padding: 12px 14px 6px;
    }

    :deep(.el-card__body) {
      padding: 0 14px 12px;
    }
  }

  .usercard .card-header {
    gap: 10px;
  }

  .usercard .nickname {
    font-size: 14px;
  }

  .usercard .bio {
    font-size: 12.5px;
  }
}
</style>
