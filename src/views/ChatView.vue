<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  getMessageHistoryApi,
  sendMessageApi,
  markReadApi,
} from "@/api/messageApi";
import { getUserInfoByIdApi } from "@/api/userApi";
import { connect, disconnect } from "@/utils/websocket";
import { ArrowLeft, Position, Loading } from "@element-plus/icons-vue";
import { debounce } from "lodash-es";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const messages = ref([]);
const inputMessage = ref("");
const sending = ref(false);
const loadingHistory = ref(false);
const historyFinished = ref(false);
const appendingOld = ref(false);
const pageNum = ref(1);
const pageSize = 20;

const conversationId = ref(route.params.conversationId);
const isNewChat = conversationId.value === "new";
const receiverId = ref(route.query.receiverId || "");

const otherUser = ref({ nickname: "", avatar: "" });

const messagesContainer = ref(null);
const messagesEnd = ref(null);
const textareaRef = ref(null);

const scrollToBottom = async (behavior = "smooth") => {
  await nextTick();
  messagesEnd.value?.scrollIntoView({ behavior });
};

const loadHistory = async () => {
  if (isNewChat || loadingHistory.value || historyFinished.value) return;
  loadingHistory.value = true;
  try {
    const res = await getMessageHistoryApi(conversationId.value, {
      pageNum: pageNum.value,
      pageSize,
    });
    if (res.data.code === 1) {
      const list = res.data.data || [];
      const reversed = list.reverse();
      if (pageNum.value === 1) {
        messages.value = reversed;
        await scrollToBottom("auto");
      } else {
        const container = messagesContainer.value;
        const oldScrollHeight = container?.scrollHeight || 0;
        appendingOld.value = true;
        messages.value = [...reversed, ...messages.value];
        await nextTick();
        if (container) {
          container.scrollTop = container.scrollHeight - oldScrollHeight;
        }
        appendingOld.value = false;
      }
      if (list.length < pageSize) {
        historyFinished.value = true;
      } else {
        pageNum.value++;
      }
    }
  } catch {
    // silently fail
  } finally {
    loadingHistory.value = false;
  }
};

const loadOtherUserInfo = async () => {
  if (!receiverId.value) return;
  try {
    const res = await getUserInfoByIdApi(receiverId.value);
    if (res.data.code === 1) {
      otherUser.value = {
        nickname: res.data.data.nickname,
        avatar: res.data.data.avatar,
      };
    }
  } catch {
    // silently fail
  }
};

const markAsRead = async () => {
  if (isNewChat) return;
  try {
    await markReadApi(conversationId.value);
  } catch {
    // silently fail
  }
};

const sendMessage = async () => {
  const content = inputMessage.value.trim();
  if (!content || sending.value) return;

  sending.value = true;
  inputMessage.value = "";

  try {
    const res = await sendMessageApi({
      receiverId: receiverId.value,
      content,
    });
    if (res.data.code === 1) {
      if (isNewChat) {
        router.replace("/conversations");
        return;
      }
      pageNum.value = 1;
      historyFinished.value = false;
      await loadHistory();
    } else {
      ElMessage.error(res.data.message || "发送失败");
      inputMessage.value = content;
    }
  } catch {
    ElMessage.error("发送失败，请重试");
    inputMessage.value = content;
  } finally {
    sending.value = false;
  }
};

const handleKeyDown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const onWsMessage = (body) => {
  try {
    const data = JSON.parse(body);
    // 判断消息是否来自当前聊天对象
    if (data.senderId + "" === receiverId.value + "") {
      messages.value.push({
        id: data.id,
        senderId: data.senderId,
        content: data.content,
        createTime: data.createTime,
      });
      scrollToBottom();
      markAsRead();
    }
  } catch {
    // ignore
  }
};

const onContainerScroll = debounce(() => {
  const container = messagesContainer.value;
  if (!container) return;
  if (container.scrollTop <= 10) {
    loadHistory();
  }
}, 300);

watch(
  () => messages.value.length,
  () => {
    if (!appendingOld.value && messages.value.length <= pageSize) {
      scrollToBottom();
    }
  },
);

onMounted(async () => {
  await loadOtherUserInfo();
  await loadHistory();
  await markAsRead();
  if (!isNewChat) {
    connect(onWsMessage);
  }
});

onUnmounted(() => {
  disconnect();
  onContainerScroll.cancel();
});
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="header-inner">
        <div class="back" @click="$router.back()">
          <el-icon size="18"><ArrowLeft /></el-icon>
        </div>
        <div class="header-info">
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
        </div>
      </div>
    </div>

    <!-- 消息区域 -->
    <div
      class="messages-area"
      ref="messagesContainer"
      @scroll="onContainerScroll"
    >
      <div v-if="loadingHistory" class="loading-top">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载历史消息...</span>
      </div>

      <!-- 新聊天欢迎 -->
      <div
        v-if="isNewChat || (!loadingHistory && messages.length === 0)"
        class="welcome-area"
      >
        <div class="welcome-card">
          <el-avatar
            v-if="otherUser.avatar"
            :src="otherUser.avatar"
            :size="64"
            class="welcome-avatar"
          />
          <h3>{{ otherUser.nickname || "新对话" }}</h3>
          <p>发送一条消息开始聊天吧</p>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(msg, idx) in messages"
        :key="msg.id || msg.createTime"
        :class="[
          'message-row',
          msg.senderId + '' === userStore.userInfo.id + ''
            ? 'mine'
            : 'other',
          idx >= messages.length - pageSize ? 'msg-new' : 'msg-old',
        ]"
      >
        <el-avatar
          v-if="msg.senderId + '' === userStore.userInfo.id + ''"
          :src="userStore.userInfo.avatar"
          :size="34"
          class="msg-avatar"
        />
        <el-avatar
          v-else
          :src="otherUser.avatar"
          :size="34"
          class="msg-avatar"
        />
        <div class="bubble-wrap">
          <div class="bubble">
            <p>{{ msg.content }}</p>
          </div>
          <span class="msg-time">{{ msg.createTime }}</span>
        </div>
      </div>

      <div ref="messagesEnd" />
    </div>

    <!-- 输入区域 -->
    <div class="input-bar">
      <div class="input-inner">
        <textarea
          ref="textareaRef"
          v-model="inputMessage"
          @keydown="handleKeyDown"
          placeholder="说点什么..."
          :disabled="sending"
          rows="1"
        />
        <button
          class="send-btn"
          :disabled="!inputMessage.trim() || sending"
          @click="sendMessage"
        >
          <el-icon v-if="!sending" :size="18"><Position /></el-icon>
          <el-icon v-else class="is-loading" :size="18"><Loading /></el-icon>
        </button>
      </div>
    </div>
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
  border-radius: 50%;
  cursor: pointer;
  color: var(--chat-text);
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--el-fill-color-light, #ebedf0);
    color: var(--chat-primary);
  }
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
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

/* ---- 消息区域 ---- */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loading-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-size: 13px;
  color: var(--chat-text-placeholder);
}

/* 欢迎卡片 */
.welcome-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.welcome-card {
  text-align: center;
  padding: 40px 24px;

  .welcome-avatar {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    margin-bottom: 16px;
  }

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--chat-text);
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: var(--chat-text-secondary);
    margin: 0;
  }
}

/* 消息气泡 */
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 4px 0;
}

.msg-new {
  animation: msgIn 0.3s ease-out;
}

@keyframes msgIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-row.mine {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.bubble-wrap {
  max-width: 68%;
  display: flex;
  flex-direction: column;
}

.mine .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  padding: 10px 14px;
  border-radius: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s;
  word-break: break-word;

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  &:hover {
    box-shadow: var(--shadow-sm);
  }
}

.mine .bubble {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border-bottom-right-radius: 6px;
}

.other .bubble {
  background: var(--chat-white);
  color: var(--chat-text);
  border-bottom-left-radius: 6px;
}

.msg-time {
  font-size: 11px;
  color: var(--chat-text-placeholder);
  margin-top: 4px;
  padding: 0 4px;
}

/* ---- 底部输入栏 ---- */
.input-bar {
  background: var(--chat-white);
  border-top: 1px solid var(--chat-border);
  flex-shrink: 0;
  box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.03);
}

.input-inner {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 16px;

  textarea {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    font-family: inherit;
    outline: none;
    background: var(--el-fill-color-light, #f0f2f5);
    color: var(--chat-text);
    transition:
      background 0.2s,
      box-shadow 0.2s;
    max-height: 120px;

    &::placeholder {
      color: var(--chat-text-placeholder);
    }

    &:focus {
      background: var(--el-fill-color, #ebedf0);
      box-shadow: 0 0 0 2px var(--chat-primary-lighter);
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.25s;
  box-shadow: 0 2px 8px rgba(204, 120, 92, 0.3);

  &:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: 0 4px 16px rgba(204, 120, 92, 0.4);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    background: var(--el-border-color, #dcdfe6);
  }
}

/* 滚动条 */
.messages-area::-webkit-scrollbar {
  width: 4px;
}

.messages-area::-webkit-scrollbar-track {
  background: transparent;
}

.messages-area::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 10px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker, #c0c4cc);
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-page {
    max-width: 100%;
  }

  .bubble-wrap {
    max-width: 75%;
  }

  .messages-area {
    padding: 16px 12px 8px;
  }
}

@media (max-width: 480px) {
  .bubble-wrap {
    max-width: 82%;
  }

  .input-inner {
    padding: 10px 12px;
  }
}
</style>
