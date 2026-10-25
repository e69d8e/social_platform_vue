<script setup>
import { ref, onMounted } from "vue";
import { ArrowLeft, ArrowDownBold } from "@element-plus/icons-vue";
import ChatMessages from "@/components/chat/ChatMessages.vue";
import ChatInputBox from "@/components/chat/ChatInputBox.vue";
import { useChat } from "@/composables/useChat";

const messagesAreaRef = ref(null);
const inputBoxRef = ref(null);

const {
  messages,
  inputMessage,
  sending,
  loadingHistory,
  historyError,
  isNearBottom,
  firstPageCount,
  isNewChat,
  receiverId,
  otherUser,
  isTouchDevice,
  scrollToBottom,
  retryHistory,
  sendMessage,
  retryMessage,
  handleAreaScroll,
  copyMessage,
} = useChat({ messagesAreaRef });

onMounted(() => {
  // 桌面端进入聊天自动聚焦输入框；触屏不聚焦以免立即弹出软键盘
  if (!isTouchDevice) {
    inputBoxRef.value?.focus();
  }
});
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="header-inner">
        <button
          class="back"
          type="button"
          aria-label="返回会话列表"
          @click="$router.back()"
        >
          <el-icon size="18"><ArrowLeft /></el-icon>
        </button>
        <!-- 对方头像/昵称可点击进入主页，聊天中也能查看对方资料 -->
        <button
          class="header-info"
          type="button"
          :disabled="!receiverId"
          aria-label="查看对方主页"
          @click="receiverId && $router.push(`/user/${receiverId}`)"
        >
          <el-avatar
            v-if="otherUser.avatar"
            :src="otherUser.avatar"
            :size="36"
            class="header-avatar"
          />
          <el-avatar v-else :size="36" class="header-avatar placeholder">
            ?
          </el-avatar>
          <div class="header-text">
            <span class="header-name">{{ otherUser.nickname || "私信" }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 消息区域 -->
    <ChatMessages
      ref="messagesAreaRef"
      :messages="messages"
      :first-page-count="firstPageCount"
      :other-user="otherUser"
      :loading-history="loadingHistory"
      :history-error="historyError"
      :is-new-chat="isNewChat"
      @scroll="handleAreaScroll"
      @retry-history="retryHistory"
      @copy="copyMessage"
      @retry-message="retryMessage"
    />

    <!-- 回到底部悬浮按钮 -->
    <Transition name="fade">
      <button
        v-show="!isNearBottom"
        class="floating-bottom-btn"
        type="button"
        title="查看最新消息"
        @click="scrollToBottom('smooth')"
      >
        <el-icon :size="16"><ArrowDownBold /></el-icon>
      </button>
    </Transition>

    <!-- 输入区域 -->
    <ChatInputBox
      ref="inputBoxRef"
      v-model="inputMessage"
      :sending="sending"
      :is-touch-device="isTouchDevice"
      @send="sendMessage"
    />
  </div>
</template>

<style lang="scss" scoped>
.chat-page {
  --chat-primary: var(--el-color-primary);
  --chat-primary-light: var(--el-color-primary-light-3);
  --chat-primary-lighter: var(--el-color-primary-light-7);
  --chat-primary-dark: var(--el-color-primary-dark-2);
  --chat-bg: var(--bg-page);
  --chat-white: var(--bg-card);
  --chat-border: var(--border-light);
  --chat-text: var(--text-primary);
  --chat-text-secondary: var(--text-secondary);
  --chat-text-placeholder: var(--text-placeholder);

  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  max-width: 720px;
  margin: 0 auto;
  background: var(--chat-bg);
}

/* ---- 顶部栏 ---- */
.chat-header {
  background: var(--chat-white);
  border-bottom: 1px solid var(--chat-border);
  flex-shrink: 0;
  box-shadow: var(--shadow-xs);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 720px;
  margin: 0 auto;
  padding: 10px 16px;
}

.back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--chat-text);
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--bg-muted);
    color: var(--chat-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: none;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
  min-height: 44px;

  &:not(:disabled):hover {
    background: var(--bg-muted);
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.header-avatar {
  box-shadow: var(--shadow-sm);
}

.header-avatar.placeholder {
  background: var(--chat-primary-lighter);
  color: var(--chat-primary);
  font-size: 16px;
  font-weight: 600;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--chat-text);
}

/* 回到底部悬浮按钮 */
.floating-bottom-btn {
  position: absolute;
  right: 24px;
  bottom: 84px;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  background: var(--chat-white);
  color: var(--chat-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: all $transition-base;

  &:hover {
    color: var(--el-color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-page {
    max-width: 100%;
  }

  .floating-bottom-btn {
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    right: 14px;
  }
}

@media (max-width: 480px) {
  .header-inner {
    padding: 8px 10px;
    gap: 8px;
  }
}
</style>
