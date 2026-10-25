<script setup>
import { ref, onUnmounted } from "vue";
import { Loading, DocumentCopy } from "@element-plus/icons-vue";
import { debounce } from "lodash-es";
import formatRelativeTime from "@/utils/formatTime";
import { useUserStore } from "@/stores/user";

defineProps({
  /** 消息列表 */
  messages: { type: Array, default: () => [] },
  /** 首屏消息条数（之后的按「新消息」动画入场） */
  firstPageCount: { type: Number, default: 0 },
  /** 对方资料 { nickname, avatar } */
  otherUser: { type: Object, default: () => ({}) },
  /** 历史消息加载中 */
  loadingHistory: { type: Boolean, default: false },
  /** 历史消息加载失败 */
  historyError: { type: Boolean, default: false },
  /** 是否为新会话（展示欢迎卡片） */
  isNewChat: { type: Boolean, default: false },
});

const emit = defineEmits(["scroll", "retry-history", "copy", "retry-message"]);

const userStore = useUserStore();
const container = ref(null);
const endAnchor = ref(null);

defineExpose({ container, endAnchor });

// 滚动节流上报：nearBottom 供父级决定新消息是否自动跟随，atTop 触发上翻加载
const onScroll = debounce(() => {
  const el = container.value;
  if (!el) return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  emit("scroll", { nearBottom, atTop: el.scrollTop <= 10 });
}, 200);

onUnmounted(() => {
  onScroll.cancel();
});
</script>

<template>
  <div class="messages-area" ref="container" @scroll="onScroll">
    <div v-if="loadingHistory" class="loading-top">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载历史消息...</span>
    </div>
    <button
      v-else-if="historyError"
      class="history-retry"
      type="button"
      @click="emit('retry-history')"
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
      <el-avatar v-else :src="otherUser.avatar" :size="34" class="msg-avatar" />
      <div class="bubble-wrap">
        <div class="bubble-container">
          <div class="bubble">
            <p>{{ msg.content }}</p>
          </div>
          <button
            class="copy-msg-btn"
            type="button"
            title="复制内容"
            @click.stop="emit('copy', msg.content)"
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
            @click="emit('retry-message', msg)"
          >
            发送失败，点击重试
          </button>
          <span class="msg-time">{{ formatRelativeTime(msg.createTime) }}</span>
        </div>
      </div>
    </div>

    <div ref="endAnchor" />
  </div>
</template>

<style lang="scss" scoped>
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
  .bubble-wrap {
    max-width: 78%;
  }

  .messages-area {
    padding: 14px 10px 8px;
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
}
</style>
