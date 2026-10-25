<script setup>
import { ref, watch } from "vue";
import { ArrowDownBold, Promotion } from "@element-plus/icons-vue";

const props = defineProps({
  /** 输入文案（v-model） */
  modelValue: { type: String, default: "" },
  /** AI 正在生成 */
  loading: { type: Boolean, default: false },
  /** 用户是否停在底部（控制回到底部按钮显隐） */
  isNearBottom: { type: Boolean, default: true },
});

const emit = defineEmits([
  "update:modelValue",
  "send",
  "abort",
  "jump-to-bottom",
]);

const textareaRef = ref(null);

// 输入框自适应高度（上限 160px）
const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
};

watch(
  () => props.modelValue,
  () => autoResize(),
);

// 处理键盘事件（中文输入法组词期间的回车不发送）
const handleKeyPress = (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    emit("send");
  }
};

const focus = () => textareaRef.value?.focus();
defineExpose({ focus });
</script>

<template>
  <div class="input-area">
    <!-- 回到底部（锚定输入区，随输入框增高上移） -->
    <Transition name="back-bottom">
      <button
        v-show="!isNearBottom"
        class="back-bottom-btn"
        type="button"
        aria-label="回到底部"
        title="回到底部"
        @click="emit('jump-to-bottom')"
      >
        <el-icon :size="16"><ArrowDownBold /></el-icon>
      </button>
    </Transition>

    <div class="input-box">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown="handleKeyPress"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        rows="1"
      ></textarea>
      <div class="input-toolbar">
        <span class="input-hint">Enter 发送 · Shift+Enter 换行</span>
        <button
          v-if="loading"
          class="stop-btn"
          type="button"
          title="停止生成本条回复"
          @click="emit('abort')"
        >
          <span class="stop-square" aria-hidden="true"></span>
          停止
        </button>
        <button
          v-else
          class="send-btn"
          :disabled="!modelValue.trim()"
          @click="emit('send')"
        >
          <el-icon :size="15"><Promotion /></el-icon>
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* ========== 输入区域 ========== */
.input-area {
  position: relative;
  flex-shrink: 0;
  padding: 12px 20px 20px;
  background: linear-gradient(to top, var(--chat-bg) 60%, transparent 100%);
}

.input-box {
  max-width: 820px;
  margin: 0 auto;
  padding: 12px 14px 10px;
  background: var(--chat-white);
  border: 1px solid var(--chat-border);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.25s,
    box-shadow 0.25s;
}

.input-box:focus-within {
  border-color: var(--chat-primary);
  box-shadow: 0 0 0 3px rgba(204, 109, 78, 0.14);
}

.input-box textarea {
  width: 100%;
  padding: 2px 4px;
  border: none;
  border-radius: 0;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
  outline: none;
  background: transparent;
  color: var(--chat-text);
  min-height: 44px;
  max-height: 160px;
  overflow-y: auto;
}

.input-box textarea::placeholder {
  color: var(--text-placeholder, #b0aea9);
}

.input-box textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-hint {
  font-size: 12px;
  color: var(--text-placeholder, #b0aea9);
}

/* 停止生成按钮：生成期间替代发送按钮出现 */
.stop-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-default);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  padding: 7px 16px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);

  .stop-square {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--el-color-danger);
  }

  &:hover {
    color: var(--el-color-danger);
    border-color: var(--el-color-danger-light-5);
    background: var(--el-color-danger-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.send-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(204, 109, 78, 0.25);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(204, 109, 78, 0.38);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

/* ========== 回到底部按钮 ========== */
.back-bottom-btn {
  position: absolute;
  right: 34px;
  bottom: calc(100% + 12px);
  z-index: 5;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--chat-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--chat-primary);
  background: var(--chat-white);
  box-shadow: var(--shadow-lg);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.back-bottom-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--glow-primary);
}

.back-bottom-enter-active,
.back-bottom-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.back-bottom-enter-from,
.back-bottom-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .input-area {
    padding: 10px 12px calc(14px + env(safe-area-inset-bottom, 0px));
  }

  .back-bottom-btn {
    right: 16px;
    bottom: calc(100% + 8px);
  }
}
</style>
