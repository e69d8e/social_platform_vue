<script setup>
import { computed } from "vue";
import FollowButton from "@/components/FollowButton.vue";
import formattedCount from "@/utils/formattedCount";
import { baseURL } from "@/utils/request";
import { highlightKeyword } from "@/utils/searchHighlight";
import { User, UserFilled } from "@element-plus/icons-vue";

const props = defineProps({
  /** 用户数据对象（列表接口返回的原样 item） */
  user: { type: Object, required: true },
  // 入场动画延迟（ms），列表网格用它做级联错峰
  delay: { type: Number, default: 0 },
  // 搜索关键词（用于高亮显示）
  keyword: { type: String, default: "" },
});

// 字段缺失时退回展示兜底值，避免空字符串卡片
const DEFAULT_AVATAR = `${baseURL.replace("/api", "")}/imgs/avatar/default.jpg`;
const avatar = computed(() => props.user.avatar || DEFAULT_AVATAR);
const rawNickname = computed(
  () => props.user.nickname || props.user.username || "用户",
);
const highlightedNickname = computed(() =>
  highlightKeyword(rawNickname.value, props.keyword),
);
const rawBio = computed(
  () => props.user.bio || "这个人很神秘，还没有填写简介~",
);
const highlightedBio = computed(() =>
  highlightKeyword(rawBio.value, props.keyword),
);
// 兼顾后端不同的粉丝数字段返回 (fansCount 或 count)
const fansCount = computed(() =>
  formattedCount(props.user.fansCount ?? props.user.count ?? 0),
);
</script>

<template>
  <div class="usercard" :style="{ '--rise-delay': `${props.delay}ms` }">
    <div class="card" @click="$router.push(`/user/${user.id}`)">
      <div class="card-header">
        <div class="avatar-wrap">
          <el-avatar :size="48" :src="avatar" class="avatar">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
        </div>
        <div class="user-info">
          <div class="nickname-row">
            <span class="nickname" v-html="highlightedNickname"></span>
            <span v-if="user.username" class="username-handle"
              >@{{ user.username }}</span
            >
          </div>
          <div class="user-meta-sub">
            <span class="fans-count">
              <el-icon :size="12"><User /></el-icon>
              {{ fansCount }} 粉丝
            </span>
            <span v-if="user.gender === 1" class="gender-tag male">男</span>
            <span v-else-if="user.gender === 2" class="gender-tag female"
              >女</span
            >
          </div>
        </div>
        <div class="action-wrap" @click.stop>
          <FollowButton
            :user-id="user.id"
            :followed="user.followed"
            size="small"
          />
        </div>
      </div>

      <div class="bio-wrap">
        <p class="bio" v-html="highlightedBio"></p>
      </div>
    </div>
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
}

.card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 18px 14px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: var(--el-color-primary-light-7);
  }

  &:active {
    transform: translateY(-1px);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-wrap {
  flex-shrink: 0;

  .avatar {
    border: 2px solid transparent;
    background-image:
      linear-gradient(var(--bg-card), var(--bg-card)), var(--gradient-primary);
    background-origin: padding-box, border-box;
    background-clip: padding-box, border-box;
    transition: transform var(--transition-base);
    box-shadow: var(--shadow-xs);

    &:hover {
      transform: scale(1.06);
    }
  }
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nickname-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.nickname {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);

  .card:hover & {
    color: var(--el-color-primary);
  }

  :deep(.search-highlight) {
    background: var(--el-color-primary-light-8);
    color: var(--el-color-primary-dark-2);
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 700;
  }
}

.username-handle {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.fans-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--el-color-primary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.gender-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  background: var(--bg-subtle);
  color: var(--text-muted);

  &.male {
    color: #4a90e2;
    background: rgba(74, 144, 226, 0.1);
  }

  &.female {
    color: #e26a8d;
    background: rgba(226, 106, 141, 0.1);
  }
}

.action-wrap {
  flex-shrink: 0;
}

.bio-wrap {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-light);
}

.bio {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.55;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  :deep(.search-highlight) {
    background: var(--el-color-primary-light-8);
    color: var(--el-color-primary-dark-2);
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 600;
  }
}

@media (max-width: 640px) {
  .card {
    padding: 12px 14px 10px;
    border-radius: var(--radius-md);
  }

  .avatar {
    width: 40px !important;
    height: 40px !important;
  }

  .nickname {
    font-size: 14px;
  }

  .bio {
    font-size: 12px;
  }
}
</style>
