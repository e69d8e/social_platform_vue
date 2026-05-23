<template>
  <div class="chat-page">
    <!-- 侧边栏 - 会话列表 -->
    <div class="sidebar">
      <el-button @click="$router.replace('/')">回到首页</el-button>
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
            <div class="message-avatar">🤖</div>
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
import { ElMessage } from "element-plus";
import { ref, computed, nextTick, onMounted, watch } from "vue";
import { baseURL } from "@/utils/request";
import { logoUrl } from "@/utils/request";
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

// 格式化时间
// const formatTime = (date) => {
//   const d = new Date(date);
//   return d.toLocaleTimeString("zh-CN", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// };

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
.chat-page {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
}

.new-chat-btn {
  padding: 8px 16px;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.session-item {
  padding: 12px 15px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  background: #f8f9fa;
}

.session-item:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.session-item.active {
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.session-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
  opacity: 0;
  transition:
    opacity 0.2s,
    color 0.2s;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #ff4757;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 40px;
}

.welcome-screen h1 {
  font-size: 36px;
  color: #1a1a1a;
  margin-bottom: 16px;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-screen p {
  font-size: 18px;
  color: #666;
  margin-bottom: 32px;
}

.start-btn {
  padding: 14px 32px;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.chat-header h3 {
  margin: 0;
  color: #1a1a1a;
  font-size: 18px;
}

/* 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
}

.message {
  display: flex;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: 0 10px;
  background: #e0e0e0;
  flex-shrink: 0;
}

.user-message .message-avatar {
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.assistant-message .message-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-content {
  max-width: 60%;
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.user-message .message-content {
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
}

.message-text {
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  text-align: right;
}

.user-message {
  color: rgba(255, 255, 255, 0.8);
}
/* .user-message .message-time {
  color: rgba(255, 255, 255, 0.8);
} */

/* 打字指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

/* 输入区域 */
.input-area {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-area textarea {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s;
  outline: none;
}

.input-area textarea:focus {
  border-color: #667eea;
}

.input-area textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.send-btn {
  padding: 12px 24px;
  /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 滚动条样式 */
.session-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.session-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }

  .message-content {
    max-width: 75%;
  }
}

@media (max-width: 480px) {
  .sidebar {
    display: none;
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
