<script setup>
import {
  ArrowLeft,
  ChatDotRound,
  ChatLineRound,
  Close,
  Plus,
} from "@element-plus/icons-vue";
import { logoUrl } from "@/utils/request";

defineProps({
  /** 会话列表 */
  sessions: { type: Array, default: () => [] },
  /** 当前选中会话 id */
  currentSessionId: { type: [String, Number], default: null },
  /** 会话列表加载中 */
  loading: { type: Boolean, default: false },
  /** 会话列表是否已到底 */
  finished: { type: Boolean, default: false },
  /** 移动端抽屉展开状态（v-model） */
  open: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:open",
  "select",
  "create",
  "delete",
  "load-more",
]);
</script>

<template>
  <aside class="sidebar" :class="{ open }">
    <div class="sidebar-brand">
      <el-avatar :size="38" :src="logoUrl" class="brand-logo"></el-avatar>
      <div class="brand-text">
        <span class="brand-title">小Y AI</span>
        <span class="brand-sub">智能助手</span>
      </div>
    </div>

    <div class="sidebar-actions">
      <el-button text class="home-btn" @click="$router.replace('/')">
        <el-icon :size="16"><ArrowLeft /></el-icon>
        首页
      </el-button>
      <button class="new-chat-btn" @click="emit('create')">
        <el-icon :size="15"><Plus /></el-icon>
        新对话
      </button>
    </div>

    <div class="session-list">
      <TransitionGroup name="session">
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-item', { active: currentSessionId === session.id }]"
          @click="emit('select', session.id)"
        >
          <el-icon class="session-icon" :size="16"><ChatDotRound /></el-icon>
          <div class="session-name">{{ session.name }}</div>
          <button
            class="delete-btn"
            title="删除会话"
            @click.stop="emit('delete', session.id)"
          >
            <el-icon :size="14"><Close /></el-icon>
          </button>
        </div>
      </TransitionGroup>

      <div v-if="!sessions.length" class="session-empty">
        <el-icon :size="30"><ChatLineRound /></el-icon>
        <p>暂无历史会话</p>
      </div>

      <button
        v-if="sessions.length && !finished"
        class="load-more-sessions"
        type="button"
        :disabled="loading"
        @click="emit('load-more')"
      >
        {{ loading ? "加载中…" : "加载更早的会话" }}
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
/* ========== 侧边栏 ========== */
.sidebar {
  width: 300px;
  background: var(--chat-white);
  border-right: 1px solid var(--chat-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 10;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
}

.brand-logo {
  box-shadow: var(--glow-primary);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-title {
  font-size: 17px;
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

.brand-sub {
  font-size: 12px;
  color: var(--chat-text-secondary);
  margin-top: 3px;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px 14px;
  border-bottom: 1px solid var(--chat-border);
}

.home-btn {
  color: var(--chat-text-secondary);
  font-size: 14px;
  font-weight: 500;
  padding: 7px 10px;
  border-radius: var(--chat-radius);
  transition: all 0.2s;
}

.home-btn:hover {
  color: var(--chat-primary);
  background: var(--chat-primary-soft);
}

.new-chat-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 16px;
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-light) 100%
  );
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(204, 109, 78, 0.25);
}

.new-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(204, 109, 78, 0.38);
}

.new-chat-btn:active {
  transform: translateY(0);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px;
  position: relative;
}

/* 会话增删时的无缝过渡 */
.session-enter-active,
.session-leave-active,
.session-move {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.session-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.session-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.session-leave-active {
  position: absolute;
  left: 12px;
  right: 12px;
}

.session-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  margin-bottom: 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.session-icon {
  color: var(--chat-text-secondary);
  flex-shrink: 0;
  transition: color 0.2s;
}

.session-item:hover {
  background: var(--chat-primary-soft);
}

.session-item:hover .session-icon,
.session-item:hover .session-name {
  color: var(--chat-primary);
}

.session-item.active {
  background: linear-gradient(
    135deg,
    var(--chat-primary) 0%,
    var(--chat-primary-dark) 100%
  );
  color: #fff;
  box-shadow: 0 6px 18px rgba(204, 109, 78, 0.32);
}

.session-item.active .session-icon {
  color: #fff;
}

.session-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  transition: color 0.2s;
}

.session-item.active .session-name {
  color: #fff;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--chat-text-secondary);
  opacity: 0;
  transition: all 0.2s;
  border-radius: 6px;
  flex-shrink: 0;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.session-item.active .delete-btn {
  opacity: 1;
  color: rgba(255, 255, 255, 0.8);
}

// 触屏设备没有 hover：保持删除按钮可见
@media (hover: none) {
  .delete-btn {
    opacity: 0.55;
  }
}

.delete-btn:hover {
  color: var(--el-color-danger) !important;
  background: var(--el-color-danger-light-9);
}

.session-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: var(--chat-text-secondary);
}

.session-empty p {
  margin: 0;
  font-size: 13px;
}

.load-more-sessions {
  display: block;
  width: calc(100% - 24px);
  margin: 8px auto 12px;
  padding: 8px 0;
  border: 1px dashed var(--border-default);
  background: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary-light-5);
  }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
}

.session-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-track {
  background: transparent;
}

.session-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color, #dcdfe6);
  border-radius: 10px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker, #c0c4cc);
}

@media (max-width: 768px) {
  // 会话列表改为抽屉
  .sidebar {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    transform: translateX(-105%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-xl);
    z-index: 60;

    &.open {
      transform: translateX(0);
    }
  }
}
</style>
