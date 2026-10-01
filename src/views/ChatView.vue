<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  getMessageHistoryApi,
  sendMessageApi,
  markReadApi,
  getConversationsApi,
} from "@/api/messageApi";
import { getUserInfoByIdApi } from "@/api/userApi";
import { connect, disconnect } from "@/utils/websocket";
import {
  ArrowLeft,
  Position,
  Loading,
  ArrowDownBold,
  DocumentCopy,
} from "@element-plus/icons-vue";
import { debounce } from "lodash-es";
import formatRelativeTime from "@/utils/formatTime";
import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const messages = ref([]);
const inputMessage = ref("");
const sending = ref(false);
const loadingHistory = ref(false);
const historyError = ref(false);
const historyFinished = ref(false);
const appendingOld = ref(false);
const isNearBottom = ref(true);
const pageNum = ref(1);
const pageSize = 20;

const conversationId = ref(route.params.conversationId);
const isNewChat = ref(conversationId.value === "new");
const receiverId = ref(route.query.receiverId || "");

// 首屏消息条数：老消息上翻加载后保持「新消息」动画边界不漂移
const firstPageCount = ref(0);

// 触屏设备上 Enter 应换行，发送交给按钮（软键盘没有 Shift）
const isTouchDevice =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(hover: none)").matches;

const otherUser = ref({ nickname: "", avatar: "" });

const messagesContainer = ref(null);
const messagesEnd = ref(null);
const textareaRef = ref(null);

const scrollToBottom = async (behavior = "smooth") => {
  await nextTick();
  messagesEnd.value?.scrollIntoView({ behavior });
};

const loadHistory = async () => {
  if (isNewChat.value || loadingHistory.value || historyFinished.value) return;
  loadingHistory.value = true;
  historyError.value = false;
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
        firstPageCount.value = reversed.length;
        await scrollToBottom("auto");
      } else {
        const container = messagesContainer.value;
        const oldScrollHeight = container?.scrollHeight || 0;
        firstPageCount.value += reversed.length;
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
    } else {
      historyError.value = true;
    }
  } catch {
    historyError.value = true;
  } finally {
    loadingHistory.value = false;
  }
};

const retryHistory = () => {
  historyError.value = false;
  loadHistory();
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
  if (isNewChat.value) return;
  try {
    await markReadApi(conversationId.value);
  } catch {
    // silently fail
  }
};

const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 120)}px`;
};

watch(inputMessage, autoResize);

// 新聊天发出第一条消息后：把当前页「接管」为真实会话，
// 用户留在对话里继续聊，而不是被踢回会话列表
const adoptConversation = async () => {
  try {
    const convRes = await getConversationsApi({ pageNum: 1, pageSize: 20 });
    const payload = convRes.data.data;
    const convs = Array.isArray(payload) ? payload : payload?.list || [];
    const hit = convs.find(
      (c) => String(c.otherUserId) === String(receiverId.value),
    );
    if (!hit?.conversationId) return;
    conversationId.value = hit.conversationId;
    isNewChat.value = false;
    await loadHistory();
    markAsRead();
    connect(onWsMessage);
    router.replace({
      path: `/chat/${hit.conversationId}`,
      query: { receiverId: receiverId.value },
    });
  } catch {
    // 会话接管失败不影响消息已送达，保持当前界面
  }
};

const deliver = async (msg) => {
  try {
    const res = await sendMessageApi({
      receiverId: receiverId.value,
      content: msg.content,
    });
    if (res.data.code === 1) {
      msg.status = "sent";
      if (res.data.data?.id) msg.id = res.data.data.id;
      if (isNewChat.value) await adoptConversation();
    } else {
      msg.status = "failed";
      ElMessage.error(res.data.message || "发送失败");
    }
  } catch {
    msg.status = "failed";
    ElMessage.error("发送失败，请重试");
  }
};

const sendMessage = async () => {
  const content = inputMessage.value.trim();
  if (!content || sending.value) return;

  sending.value = true;
  inputMessage.value = "";
  autoResize();

  // 乐观更新：立即将消息推入界面，无需等待并重拉整个列表
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const tempMsg = {
    id: `temp_${Date.now()}`,
    senderId: userStore.userInfo.id,
    content,
    createTime: timeStr,
    status: "sending",
  };
  messages.value.push(tempMsg);
  scrollToBottom("smooth");
  await deliver(tempMsg);
  sending.value = false;
};

const retryMessage = async (msg) => {
  if (msg.status !== "failed" || msg.retrying) return;
  msg.retrying = true;
  msg.status = "sending";
  await deliver(msg);
  msg.retrying = false;
};

const handleKeyDown = (e) => {
  // 触屏软键盘的 Enter 用于换行，发送走右侧按钮
  if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
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
        status: "sent",
      });
      if (isNearBottom.value) {
        scrollToBottom();
      }
      markAsRead();
    }
  } catch {
    // ignore
  }
};

const onContainerScroll = debounce(() => {
  const container = messagesContainer.value;
  if (!container) return;
  isNearBottom.value =
    container.scrollHeight - container.scrollTop - container.clientHeight < 120;
  if (container.scrollTop <= 10) {
    loadHistory();
  }
}, 200);

const copyMessage = (text) => {
  navigator.clipboard?.writeText(text).then(
    () => {
      ElMessage.success("已复制到剪贴板");
    },
    () => {
      ElMessage.error("复制失败");
    },
  );
};

onMounted(async () => {
  await loadOtherUserInfo();
  await loadHistory();
  await markAsRead();
  if (!isNewChat.value) {
    connect(onWsMessage);
  }
  // 桌面端进入聊天自动聚焦输入框；触屏不聚焦以免立即弹出软键盘
  if (!isTouchDevice) {
    textareaRef.value?.focus();
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
    <div
      class="messages-area"
      ref="messagesContainer"
      @scroll="onContainerScroll"
    >
      <div v-if="loadingHistory" class="loading-top">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载历史消息...</span>
      </div>
      <button
        v-else-if="historyError"
        class="history-retry"
        type="button"
        @click="retryHistory"
      >
        历史消息加载失败，点击重试
      </button>

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
          msg.senderId + '' === userStore.userInfo.id + '' ? 'mine' : 'other',
          idx >= firstPageCount ? 'msg-new' : 'msg-old',
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
          <div class="bubble-container">
            <div class="bubble">
              <p>{{ msg.content }}</p>
            </div>
            <button
              class="copy-msg-btn"
              type="button"
              title="复制内容"
              @click.stop="copyMessage(msg.content)"
            >
              <el-icon :size="13"><DocumentCopy /></el-icon>
            </button>
          </div>
          <div class="msg-meta-line">
            <el-icon
              v-if="msg.status === 'sending'"
              class="is-loading sending-icon"
              ><Loading
            /></el-icon>
            <button
              v-else-if="msg.status === 'failed'"
              class="failed-tag"
              type="button"
              title="重新发送"
              @click="retryMessage(msg)"
            >
              发送失败，点击重试
            </button>
            <span class="msg-time">{{
              formatRelativeTime(msg.createTime)
            }}</span>
          </div>
        </div>
      </div>

      <div ref="messagesEnd" />
    </div>

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
    <div class="input-bar">
      <div class="input-inner">
        <textarea
          ref="textareaRef"
          v-model="inputMessage"
          @keydown="handleKeyDown"
          :placeholder="
            isTouchDevice
              ? '说点什么...（点右侧按钮发送）'
              : '说点什么...（Enter 发送，Shift+Enter 换行）'
          "
          rows="1"
        />
        <button
          class="send-btn"
          :disabled="!inputMessage.trim() || sending"
          :aria-label="sending ? '发送中' : '发送'"
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

.history-retry {
  align-self: center;
  border: 1px dashed var(--border-default);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  padding: 8px 20px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--chat-primary);
    border-color: var(--chat-primary-light);
  }
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
    box-shadow: var(--shadow-lg);
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
  box-shadow: var(--shadow-xs);
}

.bubble-wrap {
  max-width: 68%;
  display: flex;
  flex-direction: column;
}

.mine .bubble-wrap {
  align-items: flex-end;
}

.bubble-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover .copy-msg-btn {
    opacity: 1;
    pointer-events: auto;
  }
}

.mine .bubble-container {
  flex-direction: row-reverse;
}

.copy-msg-btn {
  appearance: none;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  opacity: 0;
  pointer-events: none;
  transition: all $transition-fast;
  box-shadow: var(--shadow-xs);

  &:hover {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
    transform: scale(1.1);
  }
}

.bubble {
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
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
  color: var(--color-on-primary);
  border-bottom-right-radius: 6px;
}

.other .bubble {
  background: var(--chat-white);
  color: var(--chat-text);
  border-bottom-left-radius: 6px;
}

.msg-meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 0 4px;
}

.sending-icon {
  font-size: 12px;
  color: var(--text-placeholder);
}

.failed-tag {
  font-size: 11px;
  color: var(--el-color-danger);
  border: none;
  background: none;
  padding: 2px 0;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline dashed;
  text-underline-offset: 2px;

  &:hover {
    color: var(--el-color-danger-dark-2);
  }
}

.msg-time {
  font-size: 11px;
  color: var(--text-placeholder);
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

/* ---- 底部输入栏 ---- */
.input-bar {
  background: var(--chat-white);
  border-top: 1px solid var(--chat-border);
  flex-shrink: 0;
  box-shadow: var(--shadow-xs);
  position: relative;
  padding-bottom: env(safe-area-inset-bottom, 0px);
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
    background: var(--bg-muted);
    color: var(--chat-text);
    transition:
      background 0.2s,
      box-shadow 0.2s;
    max-height: 120px;

    &::placeholder {
      color: var(--chat-text-placeholder);
    }

    &:focus {
      background: var(--bg-muted);
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
  color: var(--color-on-primary);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.25s;
  box-shadow: var(--glow-primary);

  &:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: var(--glow-primary);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    background: var(--border-default);
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
  background: var(--border-default);
  border-radius: 10px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted-soft);
}

/* 触屏设备没有 hover：复制按钮常显 */
@media (hover: none) {
  .copy-msg-btn {
    opacity: 1;
    pointer-events: auto;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .chat-page {
    max-width: 100%;
  }

  .bubble-wrap {
    max-width: 78%;
  }

  .messages-area {
    padding: 14px 10px 8px;
  }

  .floating-bottom-btn {
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    right: 14px;
  }
}

@media (max-width: 480px) {
  .bubble-wrap {
    max-width: 85%;
  }

  .copy-msg-btn {
    opacity: 0.85;
    pointer-events: auto;
  }

  .header-inner {
    padding: 8px 10px;
    gap: 8px;
  }

  .input-inner {
    padding: 8px 10px;
    gap: 8px;
  }
}
</style>
