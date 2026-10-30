<script setup>
import { ref } from "vue";
import { useUserStore } from "@/stores/user";
import { logoUrl } from "@/utils/request";
import { renderCached } from "@/utils/markdown";

defineProps({
  /** 显示用消息列表 [{ role, content, timestamp }] */
  messages: { type: Array, default: () => [] },
  /** 当前会话是否正在流式输出 */
  isStreamingHere: { type: Boolean, default: false },
  /** 是否显示打字指示器（AI 尚未输出文字） */
  showTyping: { type: Boolean, default: false },
});

const emit = defineEmits(["scroll", "message-click"]);

const userStore = useUserStore();
const container = ref(null);

// 时间格式化
const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return hm;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
};

// 流式期间由父级调用（streaming tick 后触发）
const scrollToBottom = (smooth = true) => {
  const el = container.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
};

defineExpose({ scrollToBottom });

// 滚动回调：上报「是否停在底部」，供父级决定流式输出是否跟随
const onScroll = () => {
  const el = container.value;
  if (!el) return;
  emit("scroll", el.scrollHeight - el.scrollTop - el.clientHeight < 120);
};
</script>

<template>
  <div
    class="messages-container"
    ref="container"
    @scroll="onScroll"
    @click="emit('message-click', $event)"
  >
    <div class="messages-inner">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', `${msg.role}-message`]"
      >
        <div class="message-avatar">
          <el-avatar
            v-if="msg.role === 'user'"
            :src="userStore.userInfo.avatar"
          ></el-avatar>
          <el-avatar v-else :src="logoUrl"></el-avatar>
        </div>
        <div class="message-body">
          <div class="message-meta">
            <span class="message-sender">{{
              msg.role === "user" ? "我" : "小Y AI"
            }}</span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-content">
            <div
              v-if="msg.role === 'assistant'"
              class="message-text markdown-body"
              :class="{
                streaming: isStreamingHere && index === messages.length - 1,
              }"
              v-html="renderCached(msg.content)"
            ></div>
            <div v-else class="message-text">{{ msg.content }}</div>
          </div>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="showTyping" class="message assistant-message">
        <div class="message-avatar">
          <el-avatar :src="logoUrl"></el-avatar>
        </div>
        <div class="message-body">
          <div class="message-meta">
            <span class="message-sender">小Y AI</span>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* ========== 消息列表 ========== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px;
  scroll-behavior: smooth;
}

.messages-inner {
  max-width: 820px;
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
  animation: fadeInUp 0.35s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(14px);
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
  flex-shrink: 0;
  margin-top: 20px;
}

.message-avatar :deep(.el-avatar) {
  width: 38px;
  height: 38px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-body {
  display: flex;
  flex-direction: column;
  max-width: 72%;
  min-width: 0;
}

.user-message .message-body {
  align-items: flex-end;
}

.message-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
  padding: 0 4px;
}

.message-sender {
  font-size: 12px;
  font-weight: 600;
  color: var(--chat-text-secondary);
}

.message-time {
  font-size: 11px;
  color: var(--text-placeholder, #b0aea9);
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: var(--chat-shadow);
  word-wrap: break-word;
}

.assistant-message .message-content {
  background: var(--chat-white);
  border-top-left-radius: 6px;
  border: 1px solid var(--chat-border);
}

.user-message .message-content {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border-top-right-radius: 6px;
}

.message-text {
  font-size: 14px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.message-text.markdown-body {
  white-space: normal;
}

/* Markdown 内容样式（v-html 内容需用 :deep） */
.markdown-body :deep(p) {
  margin: 0 0 0.75em;
  line-height: 1.75;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1em 0 0.5em;
  font-weight: 700;
  line-height: 1.4;
}

.markdown-body :deep(h1) {
  font-size: 1.5em;
}

.markdown-body :deep(h2) {
  font-size: 1.32em;
}

.markdown-body :deep(h3) {
  font-size: 1.16em;
}

.markdown-body :deep(h4) {
  font-size: 1.05em;
}

.markdown-body :deep(h5) {
  font-size: 1em;
}

.markdown-body :deep(h6) {
  font-size: 0.92em;
  color: var(--chat-text-secondary);
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.6em;
  margin: 0.5em 0;
}

.markdown-body :deep(li) {
  margin: 0.3em 0;
  line-height: 1.7;
}

.markdown-body :deep(code) {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  border-radius: 5px;
  background: var(--el-fill-color);
  color: var(--chat-primary-dark);
}

.markdown-body :deep(pre) {
  position: relative;
  margin: 0.85em 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--chat-code-block-bg);
  border: 1px solid var(--chat-border);
  overflow-x: auto;
}

// “复制”按钮：伪元素实现，点击事件由消息容器委托处理
.markdown-body :deep(pre::after) {
  content: "复制";
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 3px 10px;
  font-size: 12px;
  color: #cfccc7;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  user-select: none;
}

.markdown-body :deep(pre:hover::after),
.markdown-body :deep(pre:focus-within::after) {
  opacity: 1;
}

/* 触屏无 hover：复制提示常显（点按代码块即复制） */
@media (hover: none) {
  .markdown-body :deep(pre::after) {
    opacity: 0.75;
  }
}

.markdown-body :deep(pre.copied::after) {
  content: "已复制 ✓";
  opacity: 1;
  color: #86d9a4;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: var(--chat-code-block-text);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
}

.markdown-body :deep(blockquote) {
  margin: 0.85em 0;
  padding: 0.6em 1em;
  border-left: 3px solid var(--chat-primary);
  background: var(--chat-primary-soft);
  color: var(--chat-text-secondary);
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(a) {
  color: var(--chat-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.markdown-body :deep(a:hover) {
  border-bottom-color: currentColor;
}

/* 站内链接高亮显示 */
.markdown-body :deep(.internal-link) {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  padding: 1px 7px;
  border-radius: 6px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  border-bottom: none;

  &:hover {
    background: var(--chat-primary);
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(204, 109, 78, 0.25);
  }
}

/* AI 发帖草稿卡片 */
.markdown-body :deep(.ai-draft-card) {
  margin: 14px 0;
  padding: 16px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--chat-primary-soft) 40%, #fff),
    var(--chat-white)
  );
  border: 1px solid var(--chat-primary-light);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.markdown-body :deep(.ai-draft-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.markdown-body :deep(.ai-draft-badge) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.markdown-body :deep(.ai-draft-cat-tag) {
  font-size: 12px;
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.markdown-body :deep(.ai-draft-title) {
  font-size: 15px;
  font-weight: 700;
  color: var(--chat-text);
  line-height: 1.4;
}

.markdown-body :deep(.ai-draft-content) {
  font-size: 13px;
  color: var(--chat-text-secondary);
  line-height: 1.6;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border: 1px dashed var(--chat-border);
}

.markdown-body :deep(.ai-draft-footer) {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.markdown-body :deep(.draft-apply-btn) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 10px rgba(204, 109, 78, 0.28);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(204, 109, 78, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--chat-border);
  margin: 1.1em 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}

/* 流式输出的闪烁光标 */
.markdown-body.streaming::after {
  content: "▍";
  display: inline-block;
  margin-left: 2px;
  color: var(--chat-primary);
  animation: cursorBlink 1s steps(2) infinite;
}

@keyframes cursorBlink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

/* ========== 打字指示器 ========== */
.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 8px 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--chat-primary);
  opacity: 0.5;
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
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 10px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker, #c0c4cc);
}

@media (max-width: 768px) {
  .messages-container {
    padding: 18px 12px;
  }

  .message-body {
    max-width: 85%;
  }
}
</style>
