<script setup>
import { ref, onMounted, computed } from "vue";
import { getPostDetailApi, likeApi, deletePostApi } from "@/api/postApi";
import { useRoute, useRouter } from "vue-router";
import { followUserApi, unfollowUserApi } from "@/api/followApi";
import { useUserStore } from "@/stores/user";
import { banPostApi } from "@/api/reviewerApi";
import { throttle } from "lodash";
import CommentComponent from "@/components/CommentComponent.vue";
import formattedCount from "@/utils/formattedCount";
import { ArrowLeft, Star, StarFilled, View, Delete, RemoveFilled } from "@element-plus/icons-vue";
// import { ElMessage } from "element-plus";

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const srcList = computed(() => [post.value.cover]);
const post = ref({
  id: "", title: "", content: "", category: "", createTime: "",
  cover: "", liked: false, likeCount: 0, userId: "", nickname: "",
  avatar: "", followed: false, viewCount: 0,
});
const dialogVisible = ref(false);
const loading = ref(true);

const getPost = async (id) => {
  const res = await getPostDetailApi(id);
  post.value = res.data.data;
};

onMounted(async () => {
  await getPost(route.params.id);
  loading.value = false;
});

const likeLoading = ref(false);
const toggleLike = throttle(async () => {
  if (likeLoading.value) return;
  likeLoading.value = true;
  const oldLiked = post.value.liked;
  const oldCount = post.value.likeCount;
  post.value.liked = !post.value.liked;
  post.value.likeCount += post.value.liked ? 1 : -1;
  try {
    const res = await likeApi(post.value.id);
    if (res.data.code !== 1) throw new Error("操作失败");
    ElMessage.success(res.data.message);
  } catch {
    post.value.liked = oldLiked;
    post.value.likeCount = oldCount;
    ElMessage.error("操作失败，请重试");
  } finally {
    likeLoading.value = false;
  }
}, 800);

const followLoading = ref(false);
const toggleFollow = throttle(async () => {
  if (userStore.userInfo.id === post.value.userId) { ElMessage.warning("不能关注自己"); return; }
  if (followLoading.value) return;
  followLoading.value = true;
  const oldFollowed = post.value.followed;
  post.value.followed = !post.value.followed;
  try {
    const res = post.value.followed ? await followUserApi(post.value.userId) : await unfollowUserApi(post.value.userId);
    if (res.data.code !== 1) throw new Error("操作失败");
    ElMessage.success(res.data.message);
  } catch {
    post.value.followed = oldFollowed;
    ElMessage.error("操作失败，请重试");
  } finally {
    followLoading.value = false;
  }
}, 800);

const deletePost = async () => {
  const res = await deletePostApi(post.value.id);
  if (res.data.code === 1) ElMessage.success(res.data.message);
  dialogVisible.value = false;
  router.back();
};

const banPost = async () => {
  const res = await banPostApi(post.value.id);
  if (res.data.code === 1) ElMessage.success(res.data.message);
  router.back();
};

const likeCount = computed(() => formattedCount(post.value.likeCount));
const viewCount = computed(() => formattedCount(post.value.viewCount));
</script>

<template>
  <div class="post-detail" v-loading="loading">
    <div class="back" @click="$router.back()">
      <el-icon size="18"><ArrowLeft /></el-icon>
      <span>返回</span>
    </div>

    <h1 class="title">{{ post.title }}</h1>

    <div class="meta">
      <div class="author">
        <el-avatar :size="44" :src="post.avatar" @click="$router.push('/user/' + post.userId)" class="pointer" />
        <span class="nickname" @click="$router.push('/user/' + post.userId)">{{ post.nickname }}</span>
        <el-button @click="toggleFollow" :type="post.followed ? 'default' : 'primary'" size="small">
          {{ post.followed ? '已关注' : '关注' }}
        </el-button>
        <el-icon v-if="userStore.userInfo.id === post.userId" @click="dialogVisible = true" class="action-icon danger"><Delete /></el-icon>
        <el-popconfirm v-if="userStore.userInfo.authority === 'REVIEWER'" title="确定封禁/解封该文章吗？" @confirm="banPost">
          <template #reference>
            <el-icon class="action-icon danger"><RemoveFilled /></el-icon>
          </template>
        </el-popconfirm>
      </div>

      <div class="stats">
        <span class="time">{{ post.createTime }}</span>
        <span class="divider">|</span>
        <el-icon @click="toggleLike" size="18" class="pointer">
          <StarFilled v-if="post.liked" style="color: var(--el-color-warning, #e6a23c)" />
          <Star v-else />
        </el-icon>
        <span>{{ likeCount }} 赞</span>
        <span class="divider">|</span>
        <el-icon size="18"><View /></el-icon>
        <span>{{ viewCount }} 浏览</span>
        <el-tag size="small" class="category-tag">{{ post.category }}</el-tag>
      </div>
    </div>

    <div v-if="post.cover" class="cover">
      <el-image :preview-src-list="srcList" :src="post.cover" fit="cover" class="cover-img" />
    </div>

    <div class="line"></div>
    <div class="content" v-html="post.content"></div>

    <el-dialog v-model="dialogVisible" title="确认删除?" width="400" center>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="deletePost">确认</el-button>
      </template>
    </el-dialog>

    <CommentComponent :post-id="route.params.id" />
  </div>
</template>

<style lang="scss" scoped>
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 16px 16px 40px;

  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: var(--el-text-color-regular, #606266);
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s;
    margin-bottom: 20px;
    &:hover {
      color: var(--el-color-primary, #409eff);
      background: var(--el-color-primary-light-9, #ecf5ff);
    }
  }

  .title {
    font-size: 26px;
    font-weight: 700;
    color: var(--el-text-color-primary, #303133);
    margin: 0 0 24px;
    line-height: 1.4;
  }

  .meta {
    margin-bottom: 20px;
  }

  .author {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;

    .nickname {
      font-size: 15px;
      font-weight: 500;
      color: var(--el-text-color-primary, #303133);
    }

    .action-icon {
      font-size: 22px;
      cursor: pointer;
      &.danger { color: var(--el-color-danger, #f56c6c); }
      &:hover { opacity: 0.7; }
    }
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary, #909399);

    .time { color: var(--el-text-color-placeholder, #c0c4cc); }
    .divider { color: var(--el-border-color, #dcdfe6); }

    .category-tag { margin-left: 10px; }
  }

  .pointer { cursor: pointer; }

  .cover {
    margin-bottom: 20px;
    border-radius: 12px;
    overflow: hidden;

    .cover-img {
      width: 100%;
      aspect-ratio: 5 / 3;
    }
  }

  .line {
    border-top: 1px solid var(--el-border-color-light, #e4e7ed);
    margin: 24px 0;
  }

  .content {
    overflow: hidden;
    line-height: 1.8;
    font-size: 15px;
    color: var(--el-text-color-regular, #606266);
    padding-bottom: 20px;

    :deep(img) {
      max-width: 100%;
      border-radius: 8px;
    }
  }
}

@media (max-width: 640px) {
  .post-detail {
    padding: 12px 12px 32px;
    .title { font-size: 22px; }
  }
}
</style>
