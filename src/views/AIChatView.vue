<template>
  <div class="chat-page">
    <!-- 侧边栏 - 会话列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>小Y AI助手</h2>
        <button @click="createNewSession" class="new-chat-btn">+ 新对话</button>
      </div>
      <div class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-item', { active: currentSessionId === session.id }]"
          @click="selectSession(session.id)"
        >
          <div class="session-name">{{ session.name }}</div>
          <button class="delete-btn" @click.stop="deleteSession(session.id)">
            ×
          </button>
        </div>
      </div>
      <div class="sidebar-footer">
        <el-button text @click="$router.replace('/')" class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          回到首页
        </el-button>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-main">
      <div v-if="!currentSessionId" class="welcome-screen">
        <h1>欢迎使用小Y AI助手</h1>
        <p>开始一个新的对话吧！</p>
        <button @click="createNewSession" class="start-btn">开始对话</button>
      </div>

      <div v-else class="chat-container">
        <div class="chat-header">
          <h3>当前对话</h3>
        </div>

        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="(msg, index) in displayMessages"
            :key="index"
            :class="['message', `${msg.role}-message`]"
          >
            <div class="message-avatar">
              <el-avatar
                v-if="msg.role === 'user'"
                :src="userStore.userInfo.avatar"
              ></el-avatar>
              <el-avatar
                v-else-if="msg.role === 'assistant'"
                :src="logoUrl"
              ></el-avatar>
            </div>
            <div class="message-content">
              <div class="message-text">{{ msg.content }}</div>
            </div>
          </div>

          <!-- 加载指示器 -->
          <div v-if="isLoading" class="message assistant-message">
            <div class="message-avatar">
              <el-avatar :src="logoUrl"></el-avatar>
            </div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <div ref="messagesEnd"></div>
        </div>

        <div class="input-area">
          <textarea
            ref="inputRef"
            v-model="inputMessage"
            @keydown="handleKeyPress"
            placeholder="输入消息... (Enter发送, Shift+Enter换行)"
            :disabled="isLoading"
            rows="3"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="!inputMessage.trim() || isLoading"
            class="send-btn"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  createSessionApi,
  deleteSessionApi,
  getSessionApi,
  getSessionContentApi,
} from "@/api/aiApi";
// import { ElMessage } from "element-plus";
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { ArrowLeft } from "@element-plus/icons-vue";
import { baseURL, logoUrl } from "@/utils/request";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// 响应式数据
const sessions = ref([]);
const currentSessionId = ref(null);
const rawMessages = ref([]); // 存储原始消息数据
const inputMessage = ref("");
const isLoading = ref(false);
const currentPage = ref(1);
const pageSize = 10;

// DOM refs
const messagesContainer = ref(null);
const messagesEnd = ref(null);
const inputRef = ref(null);

// 计算属性：将原始消息转换为显示格式
const displayMessages = computed(() => {
  return rawMessages.value
    .filter((msg) => msg.type === "USER" || msg.type === "AI")
    .map((msg) => {
      if (msg.type === "USER") {
        // 用户消息格式
        const content = msg.contents?.[0]?.text || "";
        return {
          role: "user",
          content: content,
          timestamp: msg.timestamp || new Date(),
        };
      } else if (msg.type === "AI") {
        // AI消息格式
        const content = msg.text || "";
        return {
          role: "assistant",
          content: content,
          timestamp: msg.timestamp || new Date(),
        };
      }
      return null;
    })
    .filter((msg) => msg !== null);
});

// 滚动到消息底部
const scrollToBottom = async () => {
  await nextTick();
  messagesEnd.value?.scrollIntoView({ behavior: "smooth" });
};

// 监听消息变化，自动滚动
watch(
  displayMessages,
  () => {
    scrollToBottom();
  },
  { deep: true },
);

// 加载会话列表
const loadSessions = async () => {
  try {
    const res = await getSessionApi(currentPage.value, pageSize);
    if (res.data.code === 1) {
      sessions.value = res.data.data || [];
    }
  } catch (error) {
    console.error("加载会话列表失败:", error);
    ElMessage.error("加载会话列表失败");
  }
};

// 创建新会话
const createNewSession = async () => {
  try {
    const res = await createSessionApi();
    if (res.data.code === 1) {
      currentSessionId.value = res.data.data;
      rawMessages.value = [];
      await loadSessions();
      // 聚焦到输入框
      await nextTick();
      inputRef.value?.focus();
    }
  } catch (error) {
    console.error("创建会话失败:", error);
    ElMessage.error("创建会话失败");
  }
};

// 选择会话
const selectSession = async (sessionId) => {
  currentSessionId.value = sessionId;
  try {
    const res = await getSessionContentApi(sessionId);
    if (res.data.code === 1) {
      // 后端返回的是原始消息字符串格式
      rawMessages.value = JSON.parse(res.data.data) || [];
      console.log("rawMessages.value", rawMessages.value);

      await scrollToBottom();
    }
  } catch (error) {
    console.error("加载会话消息失败:", error);
    ElMessage.error("加载会话消息失败");
  }
};

// 删除会话
const deleteSession = async (sessionId) => {
  try {
    const res = await deleteSessionApi(sessionId);
    if (res.data.code === 1) {
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = null;
        rawMessages.value = [];
      }
      await loadSessions();
    }
  } catch (error) {
    console.error("删除会话失败:", error);
    ElMessage.error("删除会话失败");
  }
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  if (!currentSessionId.value) {
    await createNewSession();
    return;
  }

  const userMessageContent = inputMessage.value;

  // 添加用户消息到原始数据
  const userMsg = {
    type: "USER",
    contents: [
      {
        text: userMessageContent,
        type: "TEXT",
      },
    ],
    timestamp: new Date(),
  };
  rawMessages.value.push(userMsg);

  inputMessage.value = "";
  isLoading.value = true;

  try {
    const response = await fetch(baseURL + "/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId: userStore.userInfo.id,
        memoryId: currentSessionId.value,
        content: userMessageContent,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";

    // 添加AI消息占位符
    const aiMsg = {
      type: "AI",
      text: "",
      toolExecutionRequests: [],
      attributes: {},
      timestamp: new Date(),
    };
    rawMessages.value.push(aiMsg);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      aiResponse += chunk;

      // 更新最后一条AI消息
      const lastMessage = rawMessages.value[rawMessages.value.length - 1];
      lastMessage.text = aiResponse;

      // 触发响应式更新
      rawMessages.value = [...rawMessages.value];
    }
  } catch (error) {
    console.error("发送消息失败:", error);
    rawMessages.value.push({
      type: "AI",
      text: "消息发送失败，请重试",
      toolExecutionRequests: [],
      attributes: {},
      timestamp: new Date(),
    });
  } finally {
    isLoading.value = false;
  }
};

// 处理键盘事件
const handleKeyPress = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// 组件挂载时加载会话列表
onMounted(() => {
  loadSessions();
});
</script>

<style scoped>
/* ========== CSS 变量映射 Element Plus 主题 ========== */
.chat-page {
  --chat-primary: var(--el-color-primary, #409eff);
  --chat-primary-light: var(--el-color-primary-light-3, #79bbff);
  --chat-primary-lighter: var(--el-color-primary-light-7, #d9ecff);
  --chat-primary-dark: var(--el-color-primary-dark-1, #3a8ee6);
  --chat-bg: var(--el-bg-color-page, #f2f3f5);
  --chat-border: var(--el-border-color-light, #e4e7ed);
  --chat-text: var(--el-text-color-primary, #303133);
  --chat-text-secondary: var(--el-text-color-secondary, #909399);
  --chat-white: #ffffff;
  --chat-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  --chat-radius: 8px;

  display: flex;
  height: 100vh;
  background: var(--chat-bg);
  color: var(--chat-text);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 280px;
  background: var(--chat-white);
  border-right: 1px solid var(--chat-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 10;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--chat-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.new-chat-btn {
  padding: 6px 14px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: var(--chat-radius);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.25s ease;
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: var(--chat-radius);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.session-item:hover {
  background: var(--chat-primary-lighter);
  border-color: var(--chat-primary-light);
}

.session-item.active {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-dark) 100%
  );
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.session-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.session-item.active .session-name {
  color: #fff;
}

.delete-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  color: var(--chat-text-secondary);
  opacity: 0;
  transition: all 0.2s;
  line-height: 1;
  border-radius: 4px;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.session-item.active .delete-btn {
  color: rgba(255, 255, 255, 0.7);
}

.delete-btn:hover {
  color: var(--el-color-danger, #f56c6c) !important;
  background: rgba(245, 108, 108, 0.1);
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
  padding: 40px;
  background: radial-gradient(
    ellipse at 50% 50%,
    var(--chat-primary-lighter) 0%,
    transparent 70%
  );
}

.welcome-screen h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
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
  font-size: 16px;
  color: var(--chat-text-secondary);
  margin-bottom: 28px;
  max-width: 400px;
  line-height: 1.6;
}

.start-btn {
  padding: 12px 36px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: var(--chat-radius);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.25);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(64, 158, 255, 0.4);
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  background: var(--chat-white);
  min-height: 0;
}

.chat-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--chat-border);
  background: var(--chat-white);
  flex-shrink: 0;
}

.chat-header h3 {
  margin: 0;
  color: var(--chat-text);
  font-size: 16px;
  font-weight: 600;
}

/* ========== 消息列表 ========== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  background: var(--chat-bg);
  scroll-behavior: smooth;
}

.message {
  display: flex;
  margin-bottom: 18px;
  animation: fadeInUp 0.35s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin: 0 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.message-avatar :deep(.el-avatar) {
  width: 38px;
  height: 38px;
}

.user-message .message-avatar {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
}

.assistant-message .message-avatar {
  background: linear-gradient(
    135deg,
    var(--el-color-success, #67c23a) 0%,
    var(--el-color-success-light-3, #95d475) 100%
  );
}

.message-content {
  max-width: 65%;
  padding: 10px 16px;
  border-radius: 16px;
  box-shadow: var(--chat-shadow);
  transition: box-shadow 0.2s;
}

.assistant-message .message-content {
  background: var(--chat-white);
  border-top-left-radius: 4px;
}

.user-message .message-content {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border-top-right-radius: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.7;
  word-wrap: break-word;
  white-space: pre-wrap;
}

/* ========== 打字指示器 ========== */
.typing-indicator {
  display: flex;
  gap: 5px;
  padding: 6px 0;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--chat-primary);
  opacity: 0.6;
  animation: typingBounce 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== 输入区域 ========== */
.input-area {
  padding: 14px 20px;
  border-top: 1px solid var(--chat-border);
  background: var(--chat-white);
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-shrink: 0;
}

.input-area textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid var(--chat-border);
  border-radius: var(--chat-radius);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
  outline: none;
  transition:
    border-color 0.25s,
    box-shadow 0.25s;
  background: var(--el-bg-color, #f5f7fa);
}

.input-area textarea:focus {
  border-color: var(--chat-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  background: var(--chat-white);
}

.input-area textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  padding: 10px 22px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: var(--chat-radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.35);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* ========== 滚动条 ========== */
.session-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 5px;
}

.session-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 10px;
}

.session-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker, #c0c4cc);
}

/* ========== 侧边栏底部 ========== */
.sidebar-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--chat-border);
}

.back-btn {
  width: 100%;
  justify-content: center;
  color: var(--chat-text-secondary);
  font-size: 13px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--chat-primary);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .sidebar {
    width: 220px;
  }

  .chat-container {
    max-width: 100%;
  }

  .message-content {
    max-width: 78%;
  }
}

@media (max-width: 480px) {
  .sidebar {
    display: none;
  }

  .chat-container {
    max-width: 100%;
  }

  .message-content {
    max-width: 85%;
  }

  .messages-container {
    padding: 12px 10px;
  }

  .input-area {
    padding: 10px 12px;
    gap: 8px;
  }
}
</style>
