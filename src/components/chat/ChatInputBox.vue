<script setup>
import { ref, watch } from "vue";
import { Position, Loading } from "@element-plus/icons-vue";

const props = defineProps({
  /** 输入文案（v-model） */
  modelValue: { type: String, default: "" },
  /** 发送中 */
  sending: { type: Boolean, default: false },
  /** 触屏设备：Enter 换行、按钮发送 */
  isTouchDevice: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "send"]);

const textareaRef = ref(null);

// 自适应高度：内容变化时收缩/撑开，上限 120px
const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 120)}px`;
};

watch(
  () => props.modelValue,
  () => autoResize(),
);

const handleKeyDown = (e) => {
  // 触屏软键盘的 Enter 用于换行，发送走右侧按钮
  if (e.key === "Enter" && !e.shiftKey && !props.isTouchDevice) {
    e.preventDefault();
    emit("send");
  }
};

/** 供父组件在进入聊天时主动聚焦（桌面端） */
const focus = () => textareaRef.value?.focus();
defineExpose({ focus });
</script>

<template>
  <div class="input-bar">
    <div class="input-inner">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
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
        :disabled="!modelValue.trim() || sending"
        :aria-label="sending ? '发送中' : '发送'"
        @click="emit('send')"
      >
        <el-icon v-if="!sending" :size="18"><Position /></el-icon>
        <el-icon v-else class="is-loading" :size="18"><Loading /></el-icon>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

@media (max-width: 480px) {
  .input-inner {
    padding: 8px 10px;
    gap: 8px;
  }
}
</style>
