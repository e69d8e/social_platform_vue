<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { addCommentApi, getCommentApi } from "@/api/commentApi";
import { useUserStore } from "@/stores/user";
import { Delete, ArrowDown, ArrowUp, Loading } from "@element-plus/icons-vue";
import { deleteCommentApi } from "@/api/reviewerApi";
import { debounce } from "lodash-es";
import formatRelativeTime from "@/utils/formatTime";

const userStore = useUserStore();
const content = ref("");
const inputCardRef = ref(null);
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

onMounted(() => {
  window.addEventListener("scroll", debouncedScrollHandler);
});

onUnmounted(() => {
  debouncedScrollHandler.cancel();
  window.removeEventListener("scroll", debouncedScrollHandler);
});

const replyContext = ref({ parentId: 0, replyUserId: null, replyUserName: "" });

const reply = (parent, child) => {
  replyContext.value.parentId = parent.id;
  replyContext.value.replyUserId = child ? child.user.id : parent.user.id;
  replyContext.value.replyUserName = child
    ? child.user.nickname
    : parent.user.nickname;
  nextTick(() => {
    inputCardRef.value?.scrollIntoView({ behavior: "smooth", block: "center" });
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

    <!-- 输入区域 -->
    <div class="comment-input-card" ref="inputCardRef">
      <div class="comment-input-row">
        <el-avatar
          :size="40"
          :src="userStore.userInfo.avatar"
          class="input-avatar"
        />
        <el-input
          ref="textareaRef"
          v-model="content"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
          :placeholder="
            replyContext.replyUserName
              ? `回复 @${replyContext.replyUserName}（Ctrl+Enter 发送）`
              : '写下你的评论...（Ctrl+Enter 发送）'
          "
          class="input-field"
          @keydown="handleKeyDown"
        />
      </div>
      <div class="submit-bar">
        <div class="reply-tag-wrap">
          <el-tag
            v-if="replyContext.replyUserName"
            closable
            @close="clearReply"
            size="small"
          >
            回复 @{{ replyContext.replyUserName }}
          </el-tag>
          <span class="shortcut-tip">按 Ctrl+Enter 快捷发送</span>
        </div>
        <el-button
          type="primary"
          size="small"
          :loading="submitting"
          :disabled="!content.trim() || submitting"
          @click="submitComment"
        >
          发表评论
        </el-button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="comments.length === 0 && !loading" class="empty-comments">
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
            v-if="userStore.userInfo.authority === 'REVIEWER'"
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
            <span class="reply-btn" @click="reply(item, child)">回复</span>
            <el-popconfirm
              v-if="userStore.userInfo.authority === 'REVIEWER'"
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
                />
              </template>
            </el-popconfirm>
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

.comment-input-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-xs);

  .comment-input-row {
    display: flex;
    gap: 12px;
  }

  .input-avatar {
    flex-shrink: 0;
    border: 2px solid var(--border-light);
    box-sizing: content-box;
  }

  .input-field {
    flex: 1;
  }

  .submit-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;

    .reply-tag-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .shortcut-tip {
      font-size: 12px;
      color: var(--text-placeholder);
    }
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
  font-size: 13px;
  color: var(--text-muted);

  .reply-btn {
    cursor: pointer;
    margin-right: 12px;
    transition: color $transition-fast;

    &:hover {
      color: var(--el-color-primary);
    }
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

    .reply-btn {
      cursor: pointer;
      color: var(--text-muted);
      margin-left: 8px;
      font-size: 12px;
      transition: color $transition-fast;

      &:hover {
        color: var(--el-color-primary);
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
    }
  }

@media (max-width: 640px) {
  .comment-section {
    margin-top: 24px;

    .comment-input-card {
      padding: 12px;
      margin-bottom: 16px;

      .comment-input-row {
        gap: 8px;
      }

      .input-avatar {
        width: 32px !important;
        height: 32px !important;
      }

      .shortcut-tip {
        display: none;
      }
    }

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
