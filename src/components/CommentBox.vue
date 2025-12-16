<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { addCommentApi, getCommentApi } from "@/api/commentApi";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const content = ref("");
// 帖子id
const props = defineProps({
  postId: {
    type: String,
    default: "",
  },
});
// const comments = ref([
//   {
//     id: 1,
//     content: "讲得很好",
//     createTime: "2023-05-01 12:00:00",
//     user: { id: 1, nickname: "Tom" },
//     children: [
//       {
//         id: 11,
//         content: "确实如此",
//         user: { id: 2, nickname: "Jerry" },
//         replyUser: { id: 1, nickname: "Tom" },
//       },
//     ],
//   },
// ]);
const comments = ref([]);
const lastId = ref("");
const offset = ref(0);
// 获取当前帖子的评论
const getComments = async () => {
  const timestamp = lastId.value || Date.now();
  const res = await getCommentApi(props.postId, {
    lastId: timestamp,
    offset: offset.value,
  });
  console.log("获取的评论", res.data.data.list);
  // comments.value = [...comments.value, ...res.data.data.list];
  const list = res.data.data.list;
  const temp = ref([]);
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const children = item.children;
    if (
      comments.value.some((comment) => {
        if (comment.id === item.id) {
          comment.children = children;
          return true;
        }
      })
    ) {
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
  if (loading.value) return;
  try {
    loading.value = true;
    console.log("加载更多...");
    // 数据加载逻辑
    await getComments();
  } finally {
    loading.value = false;
  }
};
const handleWindowScroll = () => {
  if (loading.value) return;

  // 窗口滚动到底部的判断
  const scrollTop =
    document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;
  const scrollHeight =
    document.documentElement.scrollHeight || document.body.scrollHeight;

  const threshold = 50; // 距离底部100px时触发

  if (scrollTop + clientHeight >= scrollHeight - threshold) {
    loadMore();
  }
};
onMounted(() => {
  window.addEventListener("scroll", handleWindowScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleWindowScroll);
});
/**
 * 当前回复上下文
 */
const replyContext = ref({
  parentId: 0,
  replyUserId: null,
  replyUserName: "",
});

/**
 * 选择回复对象
 * parent = 一级评论
 * child = 被回复的评论（可为空）
 */
const reply = (parent, child) => {
  replyContext.value.parentId = parent.id;
  replyContext.value.replyUserId = child ? child.user.id : parent.user.id;

  replyContext.value.replyUserName = child
    ? child.user.nickname
    : parent.user.nickname;
};

/**
 * 清空回复状态
 */
const clearReply = () => {
  replyContext.value = {
    parentId: 0,
    replyUserId: null,
    replyUserName: "",
  };
};

/**
 * 提交评论
 */
const submitComment = async () => {
  if (!content.value.trim()) {
    ElMessage.warning("评论不能为空");
    return;
  }

  const data = {
    postId: props.postId,
    content: content.value,
    parentId: replyContext.value.parentId,
    replyTo: replyContext.value.replyUserId,
  };
  console.log("提交参数", data);
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
    await getComments();
  }
  content.value = "";
  clearReply();
};
</script>

<template>
  <div class="comment-container" v-loading="loading">
    <!-- 输入框 -->
    <el-card shadow="never" class="comment-input-card">
      <div class="comment-input">
        <el-avatar :size="40" :src="userStore.userInfo.avatar" />
        <el-input
          v-model="content"
          type="textarea"
          :rows="3"
          :placeholder="
            replyContext.replyUserName
              ? `回复 @${replyContext.replyUserName}`
              : '写下你的评论...'
          "
        />
      </div>

      <div class="submit-bar">
        <div>
          <el-tag
            v-if="replyContext.replyUserName"
            closable
            @close="clearReply"
            size="small"
            style="cursor: pointer"
          >
            回复 @{{ replyContext.replyUserName }}
          </el-tag>
        </div>

        <el-button type="primary" @click="submitComment"> 发表评论 </el-button>
      </div>
    </el-card>

    <!-- 评论列表 -->
    <div class="comment-item" v-for="item in comments" :key="item.id">
      <el-avatar :size="40" :src="item.user.avatar" />

      <div class="comment-main">
        <div class="comment-header">
          <span class="username">{{ item.user.nickname }}</span>
          <span class="time">{{ item.createTime }}</span>
        </div>

        <div class="comment-content">{{ item.content }}</div>

        <div class="comment-actions">
          <span @click="reply(item, null)">回复</span>
        </div>

        <!-- 二级评论 -->
        <div class="child-comments">
          <div
            class="child-item"
            v-for="child in item.children"
            :key="child.id"
          >
            <span class="username">{{ child.user.nickname }}</span>
            <span class="reply-text">
              回复 @{{ child.replyUser.nickname }}：
            </span>
            <span>{{ child.content }}</span>

            <span class="reply-btn" @click="reply(item, child)"> 回复 </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-container {
  max-width: 800px;
  margin: 30px auto 200px;
}

.comment-input-card {
  /* 悬浮效果 */
  position: fixed;
  bottom: 20px; /* 距离底部的距离 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000; /* 确保在最上层 */
  background: white; /* 可选：添加背景色 */
  padding: 10px;
  border-radius: 8px; /* 可选：圆角 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 可选：阴影效果 */
  width: 50%;
  /* margin-bottom: 20px; */
}

.comment-input {
  display: flex;
  gap: 12px;
}

.submit-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 13px;
  color: #666;
}

/* 评论列表 */
.comment-item {
  display: flex;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
}

.comment-main {
  flex: 1;
  margin-left: 12px;
}

.comment-header {
  display: flex;
  align-items: center;
}

.username {
  font-weight: 600;
  margin-right: 10px;
}

.time {
  font-size: 12px;
  color: #999;
}

.comment-content {
  margin: 8px 0;
  line-height: 1.6;
}

.comment-actions {
  cursor: pointer;
  font-size: 13px;
  color: #666;
}

.comment-actions span {
  margin-right: 16px;
  cursor: pointer;
}

.comment-actions span:hover {
  color: #409eff;
}

/* 二级评论 */
.child-comments {
  margin-top: 10px;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 6px;
}

.child-item {
  font-size: 13px;
  margin-bottom: 6px;
}

.child-item:last-child {
  margin-bottom: 0;
}

.reply-text {
  color: #999;
  margin: 0 4px;
}
.reply-btn {
  cursor: pointer;
}
</style>
