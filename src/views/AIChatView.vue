<template>
  <div class="chat-page">
    <!-- 移动端：打开会话抽屉 -->
    <button
      class="mobile-menu-btn"
      aria-label="打开会话列表"
      @click="sidebarOpen = true"
    >
      <el-icon :size="18"><Menu /></el-icon>
    </button>

    <!-- 移动端抽屉遮罩 -->
    <div
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      @click="sidebarOpen = false"
    ></div>

    <!-- 侧边栏 - 会话列表 -->
    <AiSessionSidebar
      v-model:open="sidebarOpen"
      :sessions="sessions"
      :current-session-id="currentSessionId"
      :loading="sessionsLoading"
      :finished="sessionsFinished"
      @select="selectSession"
      @create="createNewSession"
      @delete="deleteSession"
      @load-more="loadMoreSessions"
    />

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <!-- 欢迎页 -->
      <div v-if="!currentSessionId" class="welcome-screen">
        <div class="welcome-logo">
          <el-avatar :size="88" :src="logoUrl"></el-avatar>
        </div>
        <h1>你好，我是小Y</h1>
        <p>你的智能 AI 助手，随时为你答疑解惑、创作内容。</p>
        <button class="start-btn" @click="createNewSession">
          <el-icon :size="16"><ChatDotRound /></el-icon>
          开始对话
        </button>
        <div class="suggestions">
          <span class="suggestions-label">可以试试：</span>
          <button
            v-for="s in suggestions"
            :key="s"
            class="suggestion-chip"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 聊天容器 -->
      <div v-else class="chat-container">
        <div class="chat-header">
          <div class="chat-header-title">
            <el-avatar :size="34" :src="logoUrl"></el-avatar>
            <div class="chat-header-meta">
              <h3>{{ currentSessionName }}</h3>
              <span class="chat-status">
                <i :class="['status-dot', { loading: isStreamingHere }]"></i>
                {{ isStreamingHere ? "正在输入…" : "AI 助手在线" }}
              </span>
            </div>
          </div>
          <button class="header-new-btn" @click="createNewSession">
            <el-icon :size="15"><Plus /></el-icon>
            新对话
          </button>
        </div>

        <AiMessageList
          ref="messagesListRef"
          :messages="displayMessages"
          :is-streaming-here="isStreamingHere"
          :show-typing="showTyping"
          @scroll="handleMessagesScroll"
          @message-click="onMessageClick"
        />

        <AiChatInput
          ref="inputBarRef"
          v-model="inputMessage"
          :loading="isLoading"
          :is-near-bottom="isNearBottom"
          @send="sendMessage"
          @abort="abortActiveStream"
          @jump-to-bottom="jumpToBottom"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ChatDotRound, Menu, Plus } from "@element-plus/icons-vue";
import { logoUrl } from "@/utils/request";
import AiSessionSidebar from "@/components/ai/AiSessionSidebar.vue";
import AiMessageList from "@/components/ai/AiMessageList.vue";
import AiChatInput from "@/components/ai/AiChatInput.vue";
import { useAiChat } from "@/composables/useAiChat";

const messagesListRef = ref(null);
const inputBarRef = ref(null);

const {
  sessions,
  currentSessionId,
  inputMessage,
  isLoading,
  suggestions,
  isNearBottom,
  sidebarOpen,
  sessionsLoading,
  sessionsFinished,
  displayMessages,
  currentSessionName,
  isStreamingHere,
  showTyping,
  jumpToBottom,
  loadMoreSessions,
  createNewSession,
  useSuggestion,
  selectSession,
  deleteSession,
  sendMessage,
  abortActiveStream,
  handleMessagesScroll,
} = useAiChat({
  messagesListRef,
  inputRef: inputBarRef,
});

// 点击消息内容：点到代码块时复制整段代码
const onMessageClick = (e) => {
  const pre = e.target.closest("pre");
  if (!pre) return;
  const text = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
  navigator.clipboard?.writeText(text).then(() => {
    pre.classList.add("copied");
    setTimeout(() => pre.classList.remove("copied"), 1600);
  });
};

// Esc 关闭移动端会话抽屉
const onGlobalKeydown = (e) => {
  if (e.key === "Escape") sidebarOpen.value = false;
};

// 全屏聊天页：锁定页面滚动
onMounted(() => {
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
  window.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  window.removeEventListener("keydown", onGlobalKeydown);
  abortActiveStream();
});
</script>

<style lang="scss" scoped>
/* ========== CSS 变量映射 Element Plus 主题 ========== */
.chat-page {
  --chat-primary: var(--el-color-primary);
  --chat-primary-light: var(--el-color-primary-light-3);
  --chat-primary-dark: var(--el-color-primary-dark-2);
  --chat-primary-soft: var(--el-color-primary-light-9);
  --chat-bg: var(--bg-page);
  --chat-border: var(--border-light);
  --chat-text: var(--text-primary);
  --chat-text-secondary: var(--text-secondary);
  --chat-white: var(--bg-card);
  --chat-shadow: var(--shadow-md);
  --chat-radius: 10px;
  --chat-code-block-bg: #1f1e24;
  --chat-code-block-text: #e8e6e3;

  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--chat-bg);
  color: var(--chat-text);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* ========== 主聊天区域 ========== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--chat-bg);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* 欢迎页 */
.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
  background: radial-gradient(
    ellipse 60% 50% at 50% 38%,
    var(--chat-primary-soft) 0%,
    transparent 70%
  );
}

.welcome-logo {
  margin-bottom: 22px;
  animation: float 4s ease-in-out infinite;
}

.welcome-logo :deep(.el-avatar) {
  box-shadow: 0 12px 34px rgba(204, 109, 78, 0.35);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.welcome-screen h1 {
  font-size: 34px;
  font-weight: 700;
  margin: 0 0 14px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-screen p {
  font-size: 15px;
  color: var(--chat-text-secondary);
  margin: 0 0 30px;
  max-width: 420px;
  line-height: 1.7;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 34px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 24px rgba(204, 109, 78, 0.35);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(204, 109, 78, 0.45);
}

.start-btn:active {
  transform: translateY(0);
}

.suggestions {
  margin-top: 40px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  max-width: 520px;
}

.suggestions-label {
  font-size: 13px;
  color: var(--chat-text-secondary);
}

.suggestion-chip {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  border-color: var(--chat-primary-light);
  background: var(--chat-white);
  transform: translateY(-1px);
}

/* 聊天容器 */
.chat-container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--chat-bg);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--chat-border);
  background: color-mix(in srgb, var(--chat-white) 78%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  flex-shrink: 0;
  z-index: 2;
}

.chat-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.chat-header-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header-meta h3 {
  margin: 0;
  color: var(--chat-text);
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--chat-text-secondary);
  margin-top: 3px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-color-success);
  flex-shrink: 0;
}

.status-dot.loading {
  background: var(--chat-primary);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.7);
  }
}

.header-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  font-size: 13px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.header-new-btn:hover {
  border-color: var(--chat-primary-light);
  background: var(--chat-white);
}

/* ========== 移动端菜单按钮（会话抽屉） ========== */
.mobile-menu-btn {
  display: none;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 55;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    color: #fff;
    background: linear-gradient(
      135deg,
      var(--chat-primary) 0%,
      var(--chat-primary-light) 100%
    );
    box-shadow: 0 4px 14px rgba(204, 109, 78, 0.32);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 55;
    background: rgba(24, 23, 21, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  // 头部让出抽屉按钮位置
  .chat-header {
    padding: 10px 16px 10px 60px;
  }

  .chat-header-title {
    gap: 8px;

    // 隐藏头像避免与抽屉按钮重叠
    :deep(.el-avatar) {
      display: none;
    }
  }

  .header-new-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
