<script setup>
import { ref, computed } from "vue";
import { Delete, ArrowDown, ArrowUp, Loading } from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";
import formatRelativeTime from "@/utils/formatTime";

const props = defineProps({
  /** 单条评论（含 children 子评论数组） */
  item: { type: Object, required: true },
  /** 当前正在删除的评论 id，用于行内 loading */
  deletingId: { type: [String, Number], default: null },
});

const emit = defineEmits(["reply", "delete"]);

const userStore = useUserStore();

// 子评论折叠：默认只展示 3 条，展开后全量显示
const expanded = ref(false);
const COLLAPSE_COUNT = 3;

const getVisibleChildren = computed(() => {
  const children = props.item.children || [];
  if (children.length <= COLLAPSE_COUNT || expanded.value) return children;
  return children.slice(0, COLLAPSE_COUNT);
});
</script>

<template>
  <div class="comment-item">
    <el-avatar :size="40" :src="item.user.avatar" class="comment-avatar" />
    <div class="comment-main">
      <div class="comment-header">
        <span class="username">{{ item.user.nickname }}</span>
        <span class="time">{{ formatRelativeTime(item.createTime) }}</span>
      </div>
      <div class="comment-content">{{ item.content }}</div>
      <div class="comment-actions">
        <button class="reply-btn" type="button" @click="emit('reply', item, null)">
          回复
        </button>
        <el-popconfirm
          v-if="userStore.isModerator"
          title="确认删除该评论?"
          @confirm="emit('delete', item.id)"
        >
          <template #reference>
            <el-button
              size="small"
              type="danger"
              :icon="deletingId === item.id ? Loading : Delete"
              :loading="deletingId === item.id"
              circle
              class="action-delete-btn"
            />
          </template>
        </el-popconfirm>
      </div>

      <!-- 子评论 -->
      <div class="child-comments" v-if="item.children && item.children.length">
        <div
          class="child-item"
          v-for="child in getVisibleChildren"
          :key="child.id"
        >
          <span class="username">{{ child.user.nickname }}</span>
          <span v-if="child.replyUser" class="reply-text"
            >回复 @{{ child.replyUser.nickname }}：</span
          >
          <span class="child-text">{{ child.content }}</span>
          <span class="child-actions">
            <button
              class="reply-btn"
              type="button"
              @click="emit('reply', item, child)"
            >
              回复
            </button>
            <el-popconfirm
              v-if="userStore.isModerator"
              title="确认删除该评论?"
              @confirm="emit('delete', child.id)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="danger"
                  :icon="deletingId === child.id ? Loading : Delete"
                  :loading="deletingId === child.id"
                  circle
                  class="action-delete-btn"
                />
              </template>
            </el-popconfirm>
          </span>
        </div>

        <!-- 折叠 / 展开控制 -->
        <div
          v-if="item.children.length > COLLAPSE_COUNT"
          class="expand-replies-btn"
          @click="expanded = !expanded"
        >
          <span>{{
            expanded
              ? "收起回复"
              : `展开其余 ${item.children.length - COLLAPSE_COUNT} 条回复`
          }}</span>
          <el-icon :size="12">
            <ArrowUp v-if="expanded" />
            <ArrowDown v-else />
          </el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-subtle);
    margin: 0 -8px;
    padding-left: 8px;
    padding-right: 8px;
    border-radius: var(--radius-md);
  }

  .comment-avatar {
    flex-shrink: 0;
    border: 2px solid var(--border-light);
    box-sizing: content-box;
  }
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;

  .username {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .time {
    font-size: 12px;
    color: var(--text-placeholder);
    font-variant-numeric: tabular-nums;
  }
}

.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 8px;
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 13px;
  color: var(--text-muted);

  .reply-btn {
    appearance: none;
    border: none;
    background: none;
    padding: 4px 8px;
    margin: -4px -8px;
    font-size: inherit;
    font-family: inherit;
    color: inherit;
    cursor: pointer;
    transition: color $transition-fast;

    &:hover {
      color: var(--el-color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 1px;
      border-radius: var(--radius-xs);
    }
  }

  .action-delete-btn {
    width: 24px;
    height: 24px;
    min-height: 24px;
    padding: 0;
    font-size: 12px;
  }
}

.child-comments {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-radius: $radius-md;

  .child-item {
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 8px;
    color: var(--text-secondary);

    &:last-child {
      margin-bottom: 0;
    }

    .username {
      font-weight: 600;
      color: var(--text-primary);
    }

    .reply-text {
      color: var(--text-muted);
      margin: 0 4px;
    }

    .child-text {
      word-break: break-word;
      white-space: pre-wrap;
    }

    .child-actions {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      margin-left: 12px;
      vertical-align: middle;

      .reply-btn {
        cursor: pointer;
        color: var(--text-muted);
        font-size: 12px;
        margin: 0;
        transition: color $transition-fast;

        &:hover {
          color: var(--el-color-primary);
        }
      }

      .action-delete-btn {
        width: 22px;
        height: 22px;
        min-height: 22px;
        padding: 0;
        font-size: 11px;
        vertical-align: middle;
      }
    }
  }

  .expand-replies-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-color-primary);
    cursor: pointer;
    user-select: none;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
}

@media (max-width: 640px) {
  .comment-item {
    padding: 12px 0;
    gap: 10px;

    .comment-avatar {
      width: 32px !important;
      height: 32px !important;
    }
  }

  .comment-content {
    font-size: 13.5px;
  }

  .child-comments {
    padding: 8px 10px;
    margin-top: 8px;

    .child-item {
      font-size: 12.5px;
    }
  }

  .comment-actions .reply-btn {
    display: inline-block;
    padding: 2px 4px;
  }
}
</style>
