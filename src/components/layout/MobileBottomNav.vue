<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  HomeFilled,
  ChatDotRound,
  Plus,
  User,
  Star,
  StarFilled,
} from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { useRequireLogin } from "@/composables/useRequireLogin";

defineProps({
  /** 未读私信数（由 Layout 统一轮询下发） */
  unreadCount: { type: Number, default: 0 },
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const requireLogin = useRequireLogin();

const isHomeActive = computed(
  () => route.path === "/home" || route.path === "/",
);
const isConversationsActive = computed(
  () => route.path === "/conversations" || route.path.startsWith("/chat/"),
);
const isMyFollowPostsActive = computed(() => route.path === "/followPosts");
const isMyActive = computed(() => route.path === "/my");

const goToFollowPosts = () => {
  if (!requireLogin("请先登录查看关注动态")) return;
  router.push("/followPosts");
};

const goToPublish = () => {
  if (!requireLogin("请先登录后再发帖")) return;
  router.push("/publicPost");
};

const goToConversations = () => {
  if (!requireLogin("请先登录查看私信")) return;
  router.push("/conversations");
};

const goToMy = () => {
  if (!requireLogin("请先登录查看个人中心")) return;
  router.push("/my");
};
</script>

<template>
  <nav class="mobile-bottom-nav">
    <button
      class="bottom-tab"
      type="button"
      :class="{ active: isHomeActive }"
      @click="$router.push('/home')"
    >
      <el-icon :size="20"><HomeFilled /></el-icon>
      <span class="tab-label">首页</span>
    </button>

    <button
      class="bottom-tab"
      type="button"
      :class="{ active: isMyFollowPostsActive }"
      @click="goToFollowPosts"
    >
      <el-icon :size="20"
        ><StarFilled v-if="isMyFollowPostsActive" /><Star v-else
      /></el-icon>
      <span class="tab-label">关注</span>
    </button>

    <button class="bottom-tab publish-tab" type="button" @click="goToPublish">
      <div class="publish-circle">
        <el-icon :size="20"><Plus /></el-icon>
      </div>
      <span class="tab-label">发布</span>
    </button>

    <button
      class="bottom-tab"
      type="button"
      :class="{ active: isConversationsActive }"
      @click="goToConversations"
    >
      <div class="tab-icon-wrap">
        <el-icon :size="20"><ChatDotRound /></el-icon>
        <span v-if="unreadCount > 0" class="tab-badge">{{
          unreadCount > 99 ? "99+" : unreadCount
        }}</span>
      </div>
      <span class="tab-label">私信</span>
    </button>

    <button
      class="bottom-tab"
      type="button"
      :class="{ active: isMyActive }"
      @click="goToMy"
    >
      <el-avatar
        v-if="userStore.userInfo.username && userStore.userInfo.avatar"
        :size="20"
        :src="userStore.userInfo.avatar"
        class="tab-avatar"
      />
      <el-icon v-else :size="20"><User /></el-icon>
      <span class="tab-label">{{
        userStore.userInfo.username ? "我的" : "去登录"
      }}</span>
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--glass-border);
  box-shadow: 0 -2px 16px rgba(24, 24, 22, 0.05);
  justify-content: space-around;
  align-items: center;
  user-select: none;

  .bottom-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    gap: 3px;
    border: none;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;

    .tab-label {
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
    }

    &:hover,
    &.active {
      color: var(--el-color-primary);

      .tab-label {
        font-weight: 600;
      }
    }

    &:active {
      transform: scale(0.94);
    }

    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: -2px;
      border-radius: var(--radius-md);
    }
  }

  .tab-icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    .tab-badge {
      position: absolute;
      top: -4px;
      right: -8px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: var(--radius-full);
      background: var(--el-color-danger);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      line-height: 16px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(224, 108, 108, 0.4);
      animation: badge-pop 0.35s ease;
    }
  }

  .tab-avatar {
    border: 1.5px solid transparent;
    transition: all var(--transition-fast);
  }

  .bottom-tab.active .tab-avatar {
    border-color: var(--el-color-primary);
  }

  .publish-tab {
    position: relative;

    .publish-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--gradient-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -12px;
      box-shadow: 0 4px 14px rgba(204, 109, 78, 0.38);
      transition:
        transform var(--transition-base),
        box-shadow var(--transition-base);
    }

    &:active .publish-circle {
      transform: scale(0.92);
      box-shadow: 0 2px 8px rgba(204, 109, 78, 0.3);
    }
  }
}

// 徽标数字变化时的小弹跳
@keyframes badge-pop {
  0% {
    transform: scale(0.5);
  }

  60% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    display: flex;
  }
}
</style>
