<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { addCommentApi, getCommentApi } from "@/api/commentApi";
import { deleteCommentApi } from "@/api/reviewerApi";
import { useRequireLogin } from "@/composables/useRequireLogin";
import { debounce } from "lodash-es";
import CommentItem from "@/components/comment/CommentItem.vue";
import CommentInputBar from "@/components/comment/CommentInputBar.vue";

const requireLogin = useRequireLogin();

const props = defineProps({
  postId: { type: String, default: "" },
});

const comments = ref([]);
const lastId = ref("");
const offset = ref(0);
const noMore = ref(false);
// 首屏与错误态：首评加载有骨架屏，失败有重试，不再静默白屏
const firstLoading = ref(false);
const loadError = ref(false);
// 服务端返回的评论总数（接口未提供时回退为已加载条数）
const commentTotal = ref(null);
const totalCount = computed(() =>
  commentTotal.value === null ? comments.value.length : commentTotal.value,
);

const content = ref("");
const isInputExpanded = ref(false);
const submitting = ref(false);
const deletingId = ref(null);
const inputBarRef = ref(null);
const rootRef = ref(null);

const replyContext = ref({ parentId: 0, replyUserId: null, replyUserName: "" });

/** 供父组件（帖子详情页「评论」按钮）滚动到评论区 */
const scrollTo = () => {
  rootRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};
defineExpose({ scrollTo });

const getComments = async () => {
  if (noMore.value) return;
  const timestamp = lastId.value || Date.now();
  const res = await getCommentApi(props.postId, {
    lastId: timestamp,
    offset: offset.value,
  });
  const list = res.data.data.list;
  // 接口若携带总数则采用，徽标与标题不再显示"已加载条数"冒充总数
  if (res.data.total !== undefined && res.data.total !== null) {
    commentTotal.value = Number(res.data.total);
  }

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

const loadFirstPage = async () => {
  firstLoading.value = true;
  loadError.value = false;
  try {
    await getComments();
  } catch {
    loadError.value = true;
  } finally {
    firstLoading.value = false;
  }
};

onMounted(loadFirstPage);

const retryFirstLoad = () => {
  comments.value = [];
  lastId.value = "";
  offset.value = 0;
  noMore.value = false;
  loadFirstPage();
};

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

const handleOpenInput = () => {
  if (!requireLogin("请先登录后再发表评论")) return;
  isInputExpanded.value = true;
  inputBarRef.value?.focus();
};

const handleCancelInput = () => {
  isInputExpanded.value = false;
  clearReply();
};

const scrollToComments = () => {
  rootRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const reply = (parent, child) => {
  if (!requireLogin("请先登录后再回复")) return;
  replyContext.value.parentId = parent.id;
  replyContext.value.replyUserId = child ? child.user.id : parent.user.id;
  replyContext.value.replyUserName = child
    ? child.user.nickname
    : parent.user.nickname;
  isInputExpanded.value = true;
  inputBarRef.value?.focus();
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
  if (!requireLogin("请先登录后再发表评论")) return;
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

onMounted(() => {
  window.addEventListener("scroll", debouncedScrollHandler);
});

onUnmounted(() => {
  debouncedScrollHandler.cancel();
  window.removeEventListener("scroll", debouncedScrollHandler);
});
</script>

<template>
  <div ref="rootRef" class="comment-section">
    <h3 class="comment-title">
      评论
      <span class="comment-count">{{ totalCount }}</span>
    </h3>

    <!-- 首屏骨架 -->
    <div v-if="firstLoading" class="comments-skeleton" aria-busy="true">
      <div v-for="n in 3" :key="n" class="skeleton-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-lines">
          <div class="skeleton skeleton-line w30"></div>
          <div class="skeleton skeleton-line w80"></div>
        </div>
      </div>
    </div>

    <!-- 首屏加载失败：给出重试入口 -->
    <div v-else-if="loadError" class="comments-error">
      <span>评论加载失败</span>
      <el-button type="primary" size="small" round @click="retryFirstLoad"
        >重新加载</el-button
      >
    </div>

    <!-- 评论列表 -->
    <div
      v-else-if="comments.length === 0 && !loading"
      class="empty-comments"
      @click="handleOpenInput"
      title="点击发表第一条评论"
    >
      <span class="empty-glyph" aria-hidden="true">评</span>
      <span>暂无评论，来说点什么吧</span>
    </div>

    <template v-else>
      <CommentItem
        v-for="item in comments"
        :key="item.id"
        :item="item"
        :deleting-id="deletingId"
        @reply="reply"
        @delete="deleteComment"
      />
    </template>
  </div>

  <!-- 底部悬浮灵动岛：折叠态 / 展开编辑态 -->
  <CommentInputBar
    ref="inputBarRef"
    v-model:expanded="isInputExpanded"
    v-model:content="content"
    :total-count="totalCount"
    :submitting="submitting"
    :reply-user-name="replyContext.replyUserName"
    @open="handleOpenInput"
    @cancel="handleCancelInput"
    @submit="submitComment"
    @count-click="scrollToComments"
  />
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

// 首屏骨架
.comments-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0 24px;

  .skeleton-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .skeleton-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skeleton-line {
    height: 14px;

    &.w30 {
      width: 30%;
    }

    &.w80 {
      width: 80%;
    }
  }
}

// 首屏加载失败
.comments-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
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
  .comment-section {
    margin-top: 24px;
  }
}
</style>
