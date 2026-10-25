<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Close, ChatDotRound, User, EditPen, Loading } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";

const props = defineProps({
  /** 评论总数（徽标展示） */
  totalCount: { type: Number, default: 0 },
  /** 提交中 */
  submitting: { type: Boolean, default: false },
  /** 回复目标昵称（空串表示直接评论） */
  replyUserName: { type: String, default: "" },
  /** 输入框文案（v-model:content） */
  content: { type: String, default: "" },
  /** 是否展开编辑态（v-model:expanded） */
  expanded: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:content",
  "update:expanded",
  "open",
  "cancel",
  "submit",
  "count-click",
]);

const userStore = useUserStore();
const floatingBarRef = ref(null);
const textareaRef = ref(null);

// 展开时自动聚焦输入框
watch(
  () => props.expanded,
  (expanded) => {
    if (expanded) {
      nextTick(() => {
        textareaRef.value?.focus();
      });
    }
  },
);

/** 供父组件在「点击回复」等场景下主动聚焦 */
const focus = () => {
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

defineExpose({ focus });

// 点击灵动岛外部：无内容且非回复态时收起，避免误触丢失草稿；
// 点击评论项的「回复」按钮除外（父组件会立即填充新的回复目标）
const handleClickOutside = (e) => {
  if (!props.expanded) return;
  if (
    floatingBarRef.value &&
    !floatingBarRef.value.contains(e.target) &&
    !e.target.closest?.(".reply-btn")
  ) {
    if (!props.content.trim() && !props.replyUserName) {
      emit("update:expanded", false);
    }
  }
};

const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    emit("submit");
  } else if (e.key === "Escape") {
    if (!props.content.trim()) {
      emit("cancel");
    }
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<template>
  <!-- 底部悬浮灵动岛 (Floating Capsule Island) -->
  <div
    class="floating-comment-bar"
    :class="{ 'is-expanded': expanded }"
    ref="floatingBarRef"
  >
    <!-- 紧凑折叠态 (Compact Capsule) -->
    <div v-show="!expanded" class="compact-bar">
      <div
        class="avatar-wrap"
        :title="userStore.userInfo?.nickname || '未登录'"
      >
        <el-avatar
          :size="34"
          :src="userStore.userInfo?.avatar"
          class="compact-avatar"
        >
          <el-icon :size="16"><User /></el-icon>
        </el-avatar>
      </div>

      <div class="compact-trigger" @click="emit('open')">
        <el-icon class="input-icon" :size="15"><EditPen /></el-icon>
        <span class="placeholder">
          {{
            replyUserName
              ? `回复 @${replyUserName}...`
              : "写下你的评论..."
          }}
        </span>
        <span class="shortcut-badge"> <kbd>Ctrl</kbd>+<kbd>Enter</kbd> </span>
      </div>

      <button
        class="comment-count-pill"
        type="button"
        title="查看评论"
        @click="emit('count-click')"
      >
        <el-icon :size="15"><ChatDotRound /></el-icon>
        <span class="count-num">{{ totalCount }}</span>
      </button>

      <button class="compact-send-btn" type="button" @click="emit('open')">
        <span>评论</span>
      </button>
    </div>

    <!-- 展开编辑态 (Expanded Card) -->
    <div v-show="expanded" class="expanded-card">
      <div v-if="replyUserName" class="expanded-header">
        <div class="reply-target-tag">
          <span class="reply-prefix">回复</span>
          <span class="reply-user">@{{ replyUserName }}</span>
          <button
            class="close-reply-btn"
            title="取消回复"
            @click="emit('cancel')"
            type="button"
          >
            <el-icon :size="12"><Close /></el-icon>
          </button>
        </div>
      </div>

      <div class="expanded-body">
        <el-avatar
          :size="36"
          :src="userStore.userInfo?.avatar"
          class="editor-avatar"
        >
          <el-icon :size="18"><User /></el-icon>
        </el-avatar>
        <el-input
          ref="textareaRef"
          :model-value="content"
          @update:model-value="emit('update:content', $event)"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="
            replyUserName
              ? `回复 @${replyUserName}（Ctrl+Enter 发送）`
              : '发表友善的评论，说点什么吧...（Ctrl+Enter 发送）'
          "
          class="expanded-textarea"
          @keydown="handleKeyDown"
        />
      </div>

      <div class="expanded-footer">
        <div class="footer-left">
          <span class="shortcut-tip">
            按 <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 快捷发送
          </span>
        </div>
        <div class="footer-actions">
          <button type="button" class="cancel-btn" @click="emit('cancel')">
            取消
          </button>
          <button
            type="button"
            class="publish-btn"
            :disabled="!content.trim() || submitting"
            @click="emit('submit')"
          >
            <el-icon v-if="submitting" class="is-loading" :size="14"
              ><Loading
            /></el-icon>
            <span>发表评论</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ---- 底部悬浮灵动岛 (Floating Capsule Island) ----
.floating-comment-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  width: min(720px, calc(100% - 32px));
  background: var(--glass-card);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-full);
  box-shadow:
    0 12px 36px -6px rgba(24, 24, 22, 0.12),
    0 4px 14px -2px rgba(24, 24, 22, 0.06);
  padding: 6px 8px 6px 12px;
  box-sizing: border-box;
  transition:
    width var(--transition-base),
    border-radius var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base),
    padding var(--transition-base);

  &.is-expanded {
    width: min(760px, calc(100% - 32px));
    border-radius: var(--radius-xl);
    padding: 16px 18px 14px;
    box-shadow:
      0 20px 48px -8px rgba(24, 24, 22, 0.16),
      0 6px 18px -2px rgba(24, 24, 22, 0.08);
  }
}

.compact-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;

  .avatar-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .compact-avatar {
      border: 2px solid var(--border-light);
      background: var(--bg-subtle);
      color: var(--text-muted);
      transition:
        border-color var(--transition-fast),
        transform var(--transition-fast);

      &:hover {
        border-color: var(--el-color-primary-light-3);
        transform: scale(1.04);
      }
    }
  }

  .compact-trigger {
    flex: 1;
    min-width: 0;
    height: 38px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-full);
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast),
      box-shadow var(--transition-fast);

    &:hover {
      background: var(--bg-card);
      border-color: var(--el-color-primary-light-5);
      box-shadow: 0 2px 8px rgba(204, 109, 78, 0.08);

      .input-icon {
        color: var(--el-color-primary);
        transform: rotate(-10deg);
      }

      .placeholder {
        color: var(--text-secondary);
      }
    }

    .input-icon {
      flex-shrink: 0;
      color: var(--text-placeholder);
      transition:
        color var(--transition-fast),
        transform var(--transition-fast);
    }

    .placeholder {
      flex: 1;
      font-size: 13.5px;
      color: var(--text-placeholder);
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color var(--transition-fast);
    }

    .shortcut-badge {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-placeholder);

      kbd {
        padding: 1px 5px;
        background: var(--bg-card);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        font-family: inherit;
        font-size: 10.5px;
        color: var(--text-muted);
      }
    }
  }

  .comment-count-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border-light);
    border-radius: var(--radius-full);
    background: var(--bg-subtle);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast),
      transform var(--transition-fast);

    &:hover {
      background: var(--bg-card);
      border-color: var(--el-color-primary-light-5);
      color: var(--el-color-primary);
      transform: translateY(-1px);
    }

    &:active {
      transform: scale(0.96);
    }

    .count-num {
      font-variant-numeric: tabular-nums;
    }
  }

  .compact-send-btn {
    flex-shrink: 0;
    height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--gradient-primary);
    color: #fff;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast),
      filter var(--transition-fast);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--glow-primary);
      filter: brightness(1.04);
    }

    &:active {
      transform: scale(0.96);
    }
  }
}

.expanded-card {
  width: 100%;
  animation: slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  .expanded-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;

    .reply-target-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--el-color-primary-light-9);
      border: 1px solid var(--el-color-primary-light-7);
      border-radius: var(--radius-full);
      font-size: 12.5px;

      .reply-prefix {
        color: var(--text-muted);
      }

      .reply-user {
        color: var(--el-color-primary);
        font-weight: 600;
      }

      .close-reply-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border: none;
        background: transparent;
        border-radius: 50%;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        margin-left: 2px;
        transition:
          background var(--transition-fast),
          color var(--transition-fast);

        &:hover {
          background: var(--el-color-primary-light-7);
          color: var(--el-color-primary-dark-2);
        }
      }
    }
  }

  .expanded-body {
    display: flex;
    gap: 12px;
    align-items: flex-start;

    .editor-avatar {
      flex-shrink: 0;
      margin-top: 2px;
      border: 2px solid var(--border-light);
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    .expanded-textarea {
      flex: 1;

      :deep(.el-textarea__inner) {
        border-radius: var(--radius-md);
        background: var(--bg-subtle);
        border: 1px solid var(--border-light);
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-primary);
        box-shadow: none;
        transition:
          background var(--transition-fast),
          border-color var(--transition-fast),
          box-shadow var(--transition-fast);

        &::placeholder {
          color: var(--text-placeholder);
        }

        &:focus {
          background: var(--bg-card);
          border-color: var(--el-color-primary);
          box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
        }
      }

      :deep(.el-input__count) {
        background: transparent;
        font-size: 11.5px;
        color: var(--text-placeholder);
      }
    }
  }

  .expanded-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding-left: 48px;

    .shortcut-tip {
      font-size: 12px;
      color: var(--text-placeholder);

      kbd {
        padding: 1px 5px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-light);
        border-radius: 4px;
        font-family: inherit;
        font-size: 10.5px;
        color: var(--text-muted);
      }
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 10px;

      .cancel-btn {
        padding: 6px 14px;
        border: none;
        background: transparent;
        border-radius: var(--radius-full);
        font-size: 13px;
        color: var(--text-muted);
        cursor: pointer;
        transition:
          background var(--transition-fast),
          color var(--transition-fast);

        &:hover {
          background: var(--bg-subtle);
          color: var(--text-primary);
        }
      }

      .publish-btn {
        padding: 7px 18px;
        border: none;
        border-radius: var(--radius-full);
        background: var(--gradient-primary);
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition:
          transform var(--transition-fast),
          box-shadow var(--transition-fast),
          filter var(--transition-fast),
          opacity var(--transition-fast);

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--glow-primary);
          filter: brightness(1.04);
        }

        &:active:not(:disabled) {
          transform: scale(0.96);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .is-loading {
          animation: rotating 2s linear infinite;
        }
      }
    }
  }
}

@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .floating-comment-bar {
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    width: calc(100% - 20px);
    padding: 5px 6px 5px 8px;

    &.is-expanded {
      width: calc(100% - 20px);
      padding: 12px 14px 10px;
    }
  }

  .compact-bar {
    gap: 6px;

    .compact-trigger {
      height: 35px;
      padding: 0 10px;

      .shortcut-badge {
        display: none;
      }

      .placeholder {
        font-size: 12.5px;
      }
    }

    .comment-count-pill {
      height: 34px;
      padding: 0 8px;
      font-size: 12px;
    }

    .compact-send-btn {
      height: 34px;
      padding: 0 12px;
      font-size: 12.5px;
    }
  }

  .expanded-card {
    .expanded-body {
      gap: 8px;

      .editor-avatar {
        width: 30px !important;
        height: 30px !important;
      }
    }

    .expanded-footer {
      padding-left: 0;

      .shortcut-tip {
        display: none;
      }
    }
  }
}
</style>
