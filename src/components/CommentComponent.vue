<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { addCommentApi, getCommentApi } from "@/api/commentApi";
import { useUserStore } from "@/stores/user";
import { Delete } from "@element-plus/icons-vue";
import { deleteCommentApi } from "@/api/reviewerApi";
import { debounce } from "lodash";

const userStore = useUserStore();
const content = ref("");

const props = defineProps({
  postId: { type: String, default: "" },
});

const comments = ref([]);
const lastId = ref("");
const offset = ref(0);
const noMore = ref(false);

const getComments = async () => {
  if (noMore.value) return;
  const timestamp = lastId.value || Date.now();
  const res = await getCommentApi(props.postId, { lastId: timestamp, offset: offset.value });
  const list = res.data.data.list;

  if (list.length === 0) {
    noMore.value = true;
    return;
  }

  const temp = ref([]);
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (comments.value.some((comment) => {
      if (comment.id === item.id) { comment.children = item.children; return true; }
    })) {
      continue;
    }
    temp.value.push(item);
  }
  comments.value = [...comments.value, ...temp.value];
  temp.value = [];
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
  try { await getComments(); } finally { loading.value = false; }
};

const debouncedScrollHandler = debounce(() => {
  if (loading.value || noMore.value) return;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;
  const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
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
  replyContext.value.replyUserName = child ? child.user.nickname : parent.user.nickname;
};

const clearReply = () => {
  replyContext.value = { parentId: 0, replyUserId: null, replyUserName: "" };
};

const submitComment = async () => {
  if (!content.value.trim()) { ElMessage.warning("评论不能为空"); return; }
  const res = await addCommentApi({
    postId: props.postId,
    content: content.value,
    parentId: replyContext.value.parentId,
    replyTo: replyContext.value.replyUserId,
  });
  if (res.data.code === 1) {
    ElMessage.success("评论成功");
    lastId.value = null;
    offset.value = 0;
    noMore.value = false;
    comments.value = [];
    await getComments();
  }
  content.value = "";
  clearReply();
};

const deleteComment = async (id) => {
  const res = await deleteCommentApi(props.postId, id);
  if (res.data.code === 1) {
    ElMessage.success("删除成功");
    lastId.value = null;
    offset.value = 0;
    noMore.value = false;
    comments.value = [];
    await getComments();
  }
};
</script>

<template>
  <div class="comment-section" v-loading="loading">
    <h3 class="comment-title">评论 ({{ comments.length }})</h3>

    <!-- 输入区域 -->
    <div class="comment-input-card">
      <div class="comment-input-row">
        <el-avatar :size="40" :src="userStore.userInfo.avatar" class="input-avatar" />
        <el-input
          v-model="content"
          type="textarea"
          :rows="2"
          :placeholder="replyContext.replyUserName ? `回复 @${replyContext.replyUserName}` : '写下你的评论...'"
          class="input-field"
        />
      </div>
      <div class="submit-bar">
        <el-tag v-if="replyContext.replyUserName" closable @close="clearReply" size="small">
          回复 @{{ replyContext.replyUserName }}
        </el-tag>
        <span v-else></span>
        <el-button type="primary" size="small" @click="submitComment">发表评论</el-button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="comments.length === 0 && !loading" class="empty-comments">
      <span>暂无评论，来说点什么吧</span>
    </div>

    <div class="comment-item" v-for="item in comments" :key="item.id">
      <el-avatar :size="40" :src="item.user.avatar" class="comment-avatar" />
      <div class="comment-main">
        <div class="comment-header">
          <span class="username">{{ item.user.nickname }}</span>
          <span class="time">{{ item.createTime }}</span>
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
              <el-button size="small" type="danger" :icon="Delete" circle />
            </template>
          </el-popconfirm>
        </div>

        <!-- 子评论 -->
        <div class="child-comments" v-if="item.children && item.children.length">
          <div class="child-item" v-for="child in item.children" :key="child.id">
            <span class="username">{{ child.user.nickname }}</span>
            <span class="reply-text">回复 @{{ child.replyUser.nickname }}：</span>
            <span>{{ child.content }}</span>
            <span class="reply-btn" @click="reply(item, child)">回复</span>
            <el-popconfirm
              v-if="userStore.userInfo.authority === 'REVIEWER'"
              title="确认删除该评论?"
              @confirm="deleteComment(child.id)"
            >
              <template #reference>
                <el-button size="small" type="danger" :icon="Delete" circle />
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.comment-section {
  margin-top: 32px;

  .comment-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--el-text-color-primary, #303133);
    margin: 0 0 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  }
}

.comment-input-card {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;

  .comment-input-row {
    display: flex;
    gap: 12px;
  }

  .input-avatar {
    flex-shrink: 0;
  }

  .input-field {
    flex: 1;
  }

  .submit-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);

  .comment-avatar {
    flex-shrink: 0;
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
    color: var(--el-text-color-primary, #303133);
  }

  .time {
    font-size: 12px;
    color: var(--el-text-color-placeholder, #c0c4cc);
  }
}

.comment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #606266);
  margin-bottom: 8px;
}

.comment-actions {
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);

  .reply-btn {
    cursor: pointer;
    margin-right: 12px;
    &:hover { color: var(--el-color-primary, #409eff); }
  }
}

.child-comments {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f2f3f5);
  border-radius: 8px;

  .child-item {
    font-size: 13px;
    line-height: 1.7;
    margin-bottom: 8px;
    color: var(--el-text-color-regular, #606266);

    &:last-child { margin-bottom: 0; }

    .username {
      font-weight: 600;
      color: var(--el-text-color-primary, #303133);
    }

    .reply-text {
      color: var(--el-text-color-secondary, #909399);
      margin: 0 4px;
    }

    .reply-btn {
      cursor: pointer;
      color: var(--el-text-color-secondary, #909399);
      margin-left: 8px;
      font-size: 12px;
      &:hover { color: var(--el-color-primary, #409eff); }
    }
  }
}

.empty-comments {
  text-align: center;
  padding: 32px 0;
  color: var(--el-text-color-placeholder, #c0c4cc);
  font-size: 14px;
}
</style>
