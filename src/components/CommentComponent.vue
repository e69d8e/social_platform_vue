<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { addCommentApi, getCommentApi } from "@/api/commentApi";
import { useUserStore } from "@/stores/user";
import {
  Delete,
  ArrowDown,
  ArrowUp,
  Loading,
  Close,
  ChatDotRound,
  User,
  EditPen,
} from "@element-plus/icons-vue";
import { deleteCommentApi } from "@/api/reviewerApi";
import { debounce } from "lodash-es";
import formatRelativeTime from "@/utils/formatTime";

const router = useRouter();
const userStore = useUserStore();
const content = ref("");
const isInputExpanded = ref(false);
const floatingBarRef = ref(null);
const textareaRef = ref(null);
const submitting = ref(false);
const deletingId = ref(null);

const props = defineProps({
  postId: { type: String, default: "" },
});

const comments = ref([]);
const lastId = ref("");
const offset = ref(0);
const noMore = ref(false);
const expandedParentIds = ref(new Set());

const toggleExpandReplies = (parentId) => {
  if (expandedParentIds.value.has(parentId)) {
    expandedParentIds.value.delete(parentId);
  } else {
    expandedParentIds.value.add(parentId);
  }
};

const isExpanded = (parentId) => expandedParentIds.value.has(parentId);

const getVisibleChildren = (item) => {
  if (!item.children) return [];
  if (item.children.length <= 3 || isExpanded(item.id)) {
    return item.children;
  }
  return item.children.slice(0, 3);
};

const getComments = async () => {
  if (noMore.value) return;
  const timestamp = lastId.value || Date.now();
  const res = await getCommentApi(props.postId, {
    lastId: timestamp,
    offset: offset.value,
  });
  const list = res.data.data.list;

  if (list.length === 0) {
    noMore.value = true;
    return;
  }

  const temp = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (
      comments.value.some((comment) => {
        if (comment.id === item.id) {
          comment.children = item.children;
          return true;
        }
      })
    ) {
      continue;
    }
    temp.push(item);
  }
  comments.value = [...comments.value, ...temp];
  lastId.value = res.data.data.minTime;
  offset.value = res.data.data.offset;
};

onMounted(async () => {
  await getComments();
});

const loading = ref(false);

const loadMore = async () => {
  if (loading.value || noMore.value) return;
  loading.value = true;
  try {
    await getComments();
  } finally {
    loading.value = false;
  }
};

const debouncedScrollHandler = debounce(() => {
  if (loading.value || noMore.value) return;
  const scrollTop =
    document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;
  const scrollHeight =
    document.documentElement.scrollHeight || document.body.scrollHeight;
  if (scrollTop + clientHeight >= scrollHeight - 100) loadMore();
}, 200);

const handleClickOutside = (e) => {
  if (!isInputExpanded.value) return;
  if (
    floatingBarRef.value &&
    !floatingBarRef.value.contains(e.target) &&
    !e.target.closest?.(".reply-btn")
  ) {
    if (!content.value.trim() && !replyContext.value.replyUserName) {
      isInputExpanded.value = false;
    }
  }
};

onMounted(() => {
  window.addEventListener("scroll", debouncedScrollHandler);
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  debouncedScrollHandler.cancel();
  window.removeEventListener("scroll", debouncedScrollHandler);
  document.removeEventListener("mousedown", handleClickOutside);
});

const replyContext = ref({ parentId: 0, replyUserId: null, replyUserName: "" });

const handleOpenInput = () => {
  if (!userStore.userInfo?.username) {
    ElMessage.info("请先登录后再发表评论");
    router.push("/login");
    return;
  }
  isInputExpanded.value = true;
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

const handleCancelInput = () => {
  isInputExpanded.value = false;
  clearReply();
};

const scrollToComments = () => {
  const el = document.querySelector(".comment-section");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const reply = (parent, child) => {
  if (!userStore.userInfo?.username) {
    ElMessage.info("请先登录后再回复");
    router.push("/login");
    return;
  }
  replyContext.value.parentId = parent.id;
  replyContext.value.replyUserId = child ? child.user.id : parent.user.id;
  replyContext.value.replyUserName = child
    ? child.user.nickname
    : parent.user.nickname;
  isInputExpanded.value = true;
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

const clearReply = () => {
  replyContext.value = { parentId: 0, replyUserId: null, replyUserName: "" };
};

const resetComments = async () => {
  lastId.value = "";
  offset.value = 0;
  noMore.value = false;
  comments.value = [];
  await getComments();
};

const submitComment = async () => {
  if (submitting.value) return;
  if (!userStore.userInfo?.username) {
    ElMessage.info("请先登录后再发表评论");
    router.push("/login");
    return;
  }
  if (!content.value.trim()) {
    ElMessage.warning("评论不能为空");
    return;
  }
  submitting.value = true;
  try {
    const res = await addCommentApi({
      postId: props.postId,
      content: content.value.trim(),
      parentId: replyContext.value.parentId,
      replyTo: replyContext.value.replyUserId,
    });
    if (res.data.code === 1) {
      ElMessage.success("评论成功");
      content.value = "";
      clearReply();
      isInputExpanded.value = false;
      await resetComments();
    }
  } catch {
    ElMessage.error("评论失败，请重试");
  } finally {
    submitting.value = false;
  }
};

const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    submitComment();
  } else if (e.key === "Escape") {
    if (!content.value.trim()) {
      handleCancelInput();
    }
  }
};

const deleteComment = async (id) => {
  deletingId.value = id;
  try {
    const res = await deleteCommentApi(props.postId, id);
    if (res.data.code === 1) {
      ElMessage.success("删除成功");
      await resetComments();
    }
  } catch {
    ElMessage.error("删除失败，请重试");
  } finally {
    deletingId.value = null;
  }
};
</script>

<template>
  <div class="comment-section" v-loading="loading">
    <h3 class="comment-title">
      评论
      <span class="comment-count">{{ comments.length }}</span>
    </h3>

    <!-- 评论列表 -->
    <div
      v-if="comments.length === 0 && !loading"
      class="empty-comments"
      @click="handleOpenInput"
      title="点击发表第一条评论"
    >
      <span class="empty-glyph" aria-hidden="true">评</span>
      <span>暂无评论，来说点什么吧</span>
    </div>

    <div class="comment-item" v-for="item in comments" :key="item.id">
      <el-avatar :size="40" :src="item.user.avatar" class="comment-avatar" />
      <div class="comment-main">
        <div class="comment-header">
          <span class="username">{{ item.user.nickname }}</span>
          <span class="time">{{ formatRelativeTime(item.createTime) }}</span>
        </div>
        <div class="comment-content">{{ item.content }}</div>
        <div class="comment-actions">
          <span class="reply-btn" @click="reply(item, null)">回复</span>
          <el-popconfirm
            v-if="['REVIEWER', 'ADMIN'].includes(userStore.userInfo.authority) || [2, 3].includes(userStore.userInfo.authorityId)"
            title="确认删除该评论?"
            @confirm="deleteComment(item.id)"
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
        <div
          class="child-comments"
          v-if="item.children && item.children.length"
        >
          <div
            class="child-item"
            v-for="child in getVisibleChildren(item)"
            :key="child.id"
          >
            <span class="username">{{ child.user.nickname }}</span>
            <span class="reply-text"
              >回复 @{{ child.replyUser.nickname }}：</span
            >
            <span class="child-text">{{ child.content }}</span>
            <span class="child-actions">
              <span class="reply-btn" @click="reply(item, child)">回复</span>
              <el-popconfirm
                v-if="['REVIEWER', 'ADMIN'].includes(userStore.userInfo.authority) || [2, 3].includes(userStore.userInfo.authorityId)"
                title="确认删除该评论?"
                @confirm="deleteComment(child.id)"
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
            v-if="item.children.length > 3"
            class="expand-replies-btn"
            @click="toggleExpandReplies(item.id)"
          >
            <span>{{ isExpanded(item.id) ? "收起回复" : `展开其余 ${item.children.length - 3} 条回复` }}</span>
            <el-icon :size="12">
              <ArrowUp v-if="isExpanded(item.id)" />
              <ArrowDown v-else />
            </el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 底部悬浮灵动岛 (Floating Capsule Island) -->
  <div
    class="floating-comment-bar"
    :class="{ 'is-expanded': isInputExpanded }"
    ref="floatingBarRef"
  >
    <!-- 紧凑折叠态 (Compact Capsule) -->
    <div
      v-show="!isInputExpanded"
      class="compact-bar"
    >
      <div class="avatar-wrap" :title="userStore.userInfo?.nickname || '未登录'">
        <el-avatar
          :size="34"
          :src="userStore.userInfo?.avatar"
          class="compact-avatar"
        >
          <el-icon :size="16"><User /></el-icon>
        </el-avatar>
      </div>

      <div class="compact-trigger" @click="handleOpenInput">
        <el-icon class="input-icon" :size="15"><EditPen /></el-icon>
        <span class="placeholder">
          {{
            replyContext.replyUserName
              ? `回复 @${replyContext.replyUserName}...`
              : "写下你的评论..."
          }}
        </span>
        <span class="shortcut-badge">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
        </span>
      </div>

      <button
        class="comment-count-pill"
        type="button"
        title="查看评论"
        @click="scrollToComments"
      >
        <el-icon :size="15"><ChatDotRound /></el-icon>
        <span class="count-num">{{ comments.length }}</span>
      </button>

      <button
        class="compact-send-btn"
        type="button"
        @click="handleOpenInput"
      >
        <span>评论</span>
      </button>
    </div>

    <!-- 展开编辑态 (Expanded Card) -->
    <div v-show="isInputExpanded" class="expanded-card">
      <div v-if="replyContext.replyUserName" class="expanded-header">
        <div class="reply-target-tag">
          <span class="reply-prefix">回复</span>
          <span class="reply-user">@{{ replyContext.replyUserName }}</span>
          <button
            class="close-reply-btn"
            title="取消回复"
            @click="clearReply"
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
          v-model="content"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="
            replyContext.replyUserName
              ? `回复 @${replyContext.replyUserName}（Ctrl+Enter 发送）`
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
          <button
            type="button"
            class="cancel-btn"
            @click="handleCancelInput"
          >
            取消
          </button>
          <button
            type="button"
            class="publish-btn"
            :disabled="!content.trim() || submitting"
            @click="submitComment"
          >
            <el-icon v-if="submitting" class="is-loading" :size="14"><Loading /></el-icon>
            <span>发表评论</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.comment-section {
  margin-top: 40px;

  .comment-title {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    padding: 0 0 12px 14px;
    margin: 0 0 16px;
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-light);

    // 珊瑚段落标：呼应首页小节标题
    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 5px;
      width: 4px;
      height: 17px;
      border-radius: 2px;
      background: var(--el-color-primary);
    }

    .comment-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      padding: 0 7px;
      border-radius: $radius-full;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-subtle);
    }
  }
}

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
    cursor: pointer;
    transition: color $transition-fast;

    &:hover {
      color: var(--el-color-primary);
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

  .empty-comments {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    padding: 40px 0;
    color: var(--text-placeholder);
    font-size: 14px;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition:
      background var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background: var(--bg-subtle);
      color: var(--text-secondary);

      .empty-glyph {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
    }

    .empty-glyph {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: var(--bg-subtle);
      color: var(--text-muted);
      font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
      font-size: 16px;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
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

  .comment-section {
    margin-top: 24px;

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

    .reply-btn {
      display: inline-block;
      padding: 2px 4px;
    }
  }
}
</style>
