<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HomeFilled, Sunny, Moon, Edit } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import { useThemeStore } from "@/stores/theme";
import { useSignStore } from "@/stores/sign";
import { signInApi } from "@/api/userApi";
import { ElMessage } from "element-plus";
import { logoUrl } from "@/utils/request";
import GlobalSearch from "@/components/layout/GlobalSearch.vue";

defineProps({
  /** 未读私信数（由 Layout 统一轮询下发） */
  unreadCount: { type: Number, default: 0 },
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const themeStore = useThemeStore();
const signStore = useSignStore();

const isConversationsActive = computed(
  () => route.path === "/conversations" || route.path.startsWith("/chat/"),
);
const isMyFollowPostsActive = computed(() => route.path === "/followPosts");
const isFavoritesActive = computed(() => route.path === "/favorites");
const isAiChatActive = computed(() => route.path === "/aiChat");

const myFollowPosts = () => router.push({ path: "/followPosts" });
const toFavorites = () => router.push({ path: "/favorites" });

const signing = ref(false);
const sign = async () => {
  if (signing.value) return; // 防连点并发多次签到请求
  if (signStore.signedToday) {
    ElMessage.info("今天已经签到过了");
    return;
  }
  signing.value = true;
  try {
    const res = await signInApi();
    if (res.data.code === 1) {
      const before = signStore.signDay;
      signStore.applySignState(res.data.data);
      // 天数没增长说明服务端判定今天已签过（本地状态过期等）
      ElMessage.success(
        signStore.signDay > before ? "签到成功" : "今天已经签到过了",
      );
    }
  } catch {
    // 错误提示已由请求拦截器统一处理
  } finally {
    signing.value = false;
  }
};
</script>

<template>
  <!-- 纯 header 元素：避免依赖 el-container 的子组件名判断（AppHeader 包装后不被识别为纵向布局） -->
  <header class="header">
    <div class="header-inner">
      <!-- 左侧：Logo + 签到 -->
      <div class="header-left">
        <button
          class="logo"
          type="button"
          aria-label="回到首页"
          @click="$router.push('/')"
        >
          <el-image class="logo-img" :src="logoUrl" />
          <span class="logo-text">Y社区</span>
          <el-icon class="logo-icon"><HomeFilled /></el-icon>
        </button>
        <button
          v-if="userStore.userInfo.username"
          class="sign"
          :class="{ 'is-signed': signStore.signedToday }"
          type="button"
          :title="
            signStore.signedToday
              ? `今天已签到，已连续签到 ${signStore.signDay} 天`
              : `点击签到，已连续签到 ${signStore.signDay} 天`
          "
          :disabled="signing || signStore.signedToday"
          @click="sign"
        >
          <el-tag
            size="small"
            effect="plain"
            :type="signStore.signedToday ? 'success' : 'warning'"
            >{{ signStore.signedToday ? "已签到" : "点击签到" }}</el-tag
          >
          <span class="sign-text">已连续签到 {{ signStore.signDay }} 天</span>
        </button>
      </div>

      <!-- 中间：搜索（桌面端输入区 + 移动端快捷按钮与弹窗） -->
      <GlobalSearch />

      <!-- 右侧区域：工具 + 导航 + 用户 -->
      <div class="header-right">
        <!-- 暗色模式切换 -->
        <button
          class="theme-toggle-btn"
          :title="themeStore.isDark ? '切换浅色模式' : '切换暗色模式'"
          type="button"
          @click="themeStore.toggle"
        >
          <el-icon :size="16">
            <Sunny v-if="themeStore.isDark" />
            <Moon v-else />
          </el-icon>
        </button>

        <!-- AI 助手 -->
        <button
          v-if="userStore.userInfo.username"
          class="nav-pill ai-nav-pill"
          :class="{ 'is-nav-active': isAiChatActive }"
          type="button"
          title="AI 助手"
          @click="$router.push('/aiChat')"
        >
          <span class="ai-sparkle">✦</span>
          <span class="ai-text">AI 助手</span>
        </button>

        <!-- 右侧导航 (桌面端与平板端) -->
        <div class="header-actions">
          <template v-if="userStore.userInfo.username">
            <el-badge
              v-if="unreadCount > 0"
              :key="unreadCount"
              :value="unreadCount"
              :max="99"
              class="msg-badge"
            >
              <button
                class="nav-pill"
                :class="{ 'is-nav-active': isConversationsActive }"
                type="button"
                @click="$router.push('/conversations')"
              >
                私信
              </button>
            </el-badge>
            <button
              v-else
              class="nav-pill"
              :class="{ 'is-nav-active': isConversationsActive }"
              type="button"
              @click="$router.push('/conversations')"
            >
              私信
            </button>
            <button
              class="nav-pill nav-pill-fav"
              :class="{ 'is-nav-active': isFavoritesActive }"
              type="button"
              @click="toFavorites"
            >
              收藏
            </button>
            <button
              class="nav-pill nav-pill-follow"
              :class="{ 'is-nav-active': isMyFollowPostsActive }"
              type="button"
              @click="myFollowPosts"
            >
              我的关注
            </button>
            <button
              class="publish-btn"
              type="button"
              @click="$router.push('/publicPost')"
            >
              <el-icon :size="14"><Edit /></el-icon>
              <span>发布</span>
            </button>
          </template>
        </div>

        <!-- 右侧用户 -->
        <div class="header-user">
          <template v-if="!userStore.userInfo.username">
            <el-button
              type="primary"
              size="small"
              @click="$router.push('/login')"
              >去登录</el-button
            >
          </template>
          <template v-else>
            <button
              class="user-btn"
              type="button"
              aria-label="进入个人中心"
              @click="$router.push('/my')"
            >
              <el-avatar
                class="user-avatar"
                :size="36"
                :src="userStore.userInfo.avatar"
              />
              <span class="user-nickname">
                {{ userStore.userInfo.nickname }}
              </span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 1px 12px rgba(24, 24, 22, 0.03);
  transition:
    background-color var(--transition-base),
    border-color var(--transition-base);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  height: 64px;
  position: relative;
}

// ---- Logo & Left ----
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  padding: 4px 6px;
  margin: -4px -6px;
  cursor: pointer;
  user-select: none;
  font-family: inherit;
  transition: transform var(--transition-base);

  &:hover {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
}

.logo-img {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(204, 109, 78, 0.2);
}

.logo-text {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.logo-icon {
  font-size: 16px;
  color: var(--el-color-primary);
  opacity: 0.8;
}

// ---- Sign-in ----
.sign {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-subtle);
  border: 1px solid var(--border-light);
  transition: all var(--transition-base);
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: default;
    opacity: 1;
  }

  &.is-signed {
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.sign-text {
  white-space: nowrap;
  font-size: 11px;
  color: var(--text-secondary);
}

// ---- Right Zone ----
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-base);

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-7);
    background: var(--bg-subtle);
    transform: rotate(15deg);
  }
}

.ai-nav-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  flex-shrink: 0;

  .ai-sparkle {
    font-size: 12px;
    color: var(--el-color-warning);
  }
}

// ---- Navigation Pills & Buttons ----
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  .msg-badge :deep(.el-badge__content) {
    animation: badge-pop 0.35s ease;
  }
}

.nav-pill {
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-subtle);
    color: var(--el-color-primary);
  }

  &.is-nav-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }
}

.publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--gradient-primary);
  border: none;
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  border-radius: var(--radius-full);
  padding: 7px 18px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(204, 109, 78, 0.25);
  transition: all var(--transition-base);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--glow-primary);
  }

  &:active {
    transform: translateY(0);
  }
}

// ---- User section ----
.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  padding: 4px 6px;
  margin: -4px -6px;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-family: inherit;
  transition: background var(--transition-base);

  &:hover .user-avatar {
    transform: scale(1.06);
    border-color: var(--el-color-primary);
    box-shadow: var(--glow-primary);
  }

  &:hover .user-nickname {
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.user-avatar {
  flex-shrink: 0;
  border: 2px solid var(--border-light);
  transition:
    transform var(--transition-base),
    border-color var(--transition-base);
}

.user-nickname {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-base);
}

// 未读徽标数字变化时的小弹跳
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

// 响应式隐藏梯度：严格保障中间搜索框在所有尺寸下均有充裕空间，绝不折叠为单个图标
@media (max-width: 1280px) {
  .header-inner {
    gap: 12px;
    padding: 0 16px;
  }

  .sign-text {
    display: none;
  }

  .sign {
    padding: 3px 8px;
  }

  .nav-pill {
    padding: 5px 10px;
    font-size: 13px;
  }

  .publish-btn {
    padding: 6px 14px;
    font-size: 13px;
  }
}

@media (max-width: 1140px) {
  // 梯度1：空间紧凑时优先隐藏次级文字导航（收藏、关注），腾出空间给搜索框
  .nav-pill-fav,
  .nav-pill-follow {
    display: none !important;
  }

  .ai-text {
    display: none;
  }

  .ai-nav-pill {
    padding: 5px 8px;
  }
}

@media (max-width: 960px) {
  // 梯度2：平板端彻底隐藏顶栏所有动作按钮与签到（底部导航已集成完整的关注、发布、消息、我的）
  .header-actions {
    display: none !important;
  }

  .sign {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .header-inner {
    padding: 0 12px;
    gap: 10px;
    height: 56px;
  }

  // 梯度3：移动端隐藏 AI 助手与用户文字昵称，仅保留头像
  .ai-nav-pill {
    display: none !important;
  }

  .user-nickname {
    display: none !important;
  }

  .logo-icon {
    display: none;
  }
}

@media (max-width: 480px) {
  .header-inner {
    padding: 0 8px;
    gap: 8px;
    height: 52px;
  }

  // 梯度4：小屏手机优先隐藏主题切换按钮，全额空间让给 Logo、搜索框与头像
  .theme-toggle-btn {
    display: none !important;
  }

  .logo-text {
    font-size: 14.5px;
  }

  .logo-img {
    width: 28px;
    height: 28px;
  }

  .user-avatar {
    width: 30px !important;
    height: 30px !important;
  }
}
</style>
