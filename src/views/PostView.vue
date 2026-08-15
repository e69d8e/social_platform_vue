<script setup>
import { ref, onMounted, computed } from "vue";
import {
  getPostDetailApi,
  likeApi,
  deletePostApi,
  recordPostViewApi,
} from "@/api/postApi";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { banPostApi } from "@/api/reviewerApi";
import { throttle } from "lodash-es";
import DOMPurify from "dompurify";
import CommentComponent from "@/components/CommentComponent.vue";
import BackButton from "@/components/BackButton.vue";
import FollowButton from "@/components/FollowButton.vue";
import formattedCount from "@/utils/formattedCount";
import {
  Star,
  StarFilled,
  View,
  Delete,
  RemoveFilled,
} from "@element-plus/icons-vue";
// import { ElMessage } from "element-plus";

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const srcList = computed(() => [post.value.cover]);
const post = ref({
  id: "",
  title: "",
  content: "",
  category: "",
  createTime: "",
  cover: "",
  liked: false,
  likeCount: 0,
  userId: "",
  nickname: "",
  avatar: "",
  followed: false,
  viewCount: 0,
});
const dialogVisible = ref(false);
const loading = ref(true);

const getPost = async (id) => {
  try {
    const res = await getPostDetailApi(id);
    post.value = res.data.data;
  } catch {
    ElMessage.error("加载帖子失败");
  }
};

onMounted(async () => {
  await getPost(route.params.id);
  loading.value = false;
  recordPostViewApi(route.params.id);
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

const deletePost = async () => {
  try {
    const res = await deletePostApi(post.value.id);
    if (res.data.code === 1) ElMessage.success(res.data.message);
    dialogVisible.value = false;
    router.back();
  } catch {
    ElMessage.error("删除失败，请重试");
  }
};

const banPost = async () => {
  try {
    const res = await banPostApi(post.value.id);
    if (res.data.code === 1) ElMessage.success(res.data.message);
    router.back();
  } catch {
    ElMessage.error("操作失败，请重试");
  }
};

const likeCount = computed(() => formattedCount(post.value.likeCount));
const viewCount = computed(() => formattedCount(post.value.viewCount));
const sanitizedContent = computed(() => DOMPurify.sanitize(post.value.content));
</script>

<template>
  <div class="post-detail" v-loading="loading">
    <BackButton class="back-margin" />

    <h1 class="title">{{ post.title }}</h1>

    <div class="meta">
      <div class="author">
        <el-avatar
          :size="44"
          :src="post.avatar"
          @click="$router.push('/user/' + post.userId)"
          class="pointer"
        />
        <span class="nickname" @click="$router.push('/user/' + post.userId)">{{
          post.nickname
        }}</span>
        <FollowButton
          :user-id="post.userId"
          :followed="post.followed"
          size="small"
          :round="false"
        />
        <el-icon
          v-if="userStore.userInfo.id === post.userId"
          @click="dialogVisible = true"
          class="action-icon danger"
          ><Delete
        /></el-icon>
        <el-popconfirm
          v-if="userStore.userInfo.authorityId === 3"
          title="确定封禁/解封该文章吗？"
          @confirm="banPost"
        >
          <template #reference>
            <el-icon class="action-icon danger"><RemoveFilled /></el-icon>
          </template>
        </el-popconfirm>
      </div>

      <div class="stats">
        <span class="time">{{ post.createTime }}</span>
        <span class="divider">|</span>
        <el-icon @click="toggleLike" size="18" class="pointer">
          <StarFilled
            v-if="post.liked"
            style="color: var(--el-color-warning)"
          />
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
      <el-image
        :preview-src-list="srcList"
        :src="post.cover"
        fit="cover"
        class="cover-img"
      />
    </div>

    <div class="line"></div>
    <div class="content" v-html="sanitizedContent"></div>

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

  .back-margin {
    margin-bottom: 20px;
  }

  .title {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary);
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
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      transition: color $transition-base;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    .action-icon {
      font-size: 22px;
      cursor: pointer;
      transition: all $transition-base;

      &.danger {
        color: var(--el-color-danger);
      }

      &:hover {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);

    .time {
      color: var(--text-placeholder);
    }

    .divider {
      color: var(--border-default);
    }

    .category-tag {
      margin-left: 10px;
    }
  }

  .pointer {
    cursor: pointer;
    transition: transform $transition-base;

    &:hover {
      transform: scale(1.05);
    }
  }

  .cover {
    margin-bottom: 20px;
    border-radius: $radius-lg;
    overflow: hidden;

    .cover-img {
      width: 100%;
      aspect-ratio: 16 / 9;
    }
  }

  .line {
    border-top: 1px solid var(--border-light);
    margin: 24px 0;
  }

  .content {
    overflow: hidden;
    line-height: 1.8;
    font-size: 15px;
    color: var(--text-secondary);
    padding-bottom: 20px;

    :deep(img) {
      max-width: 100%;
      border-radius: $radius-md;
    }
  }
}

@media (max-width: 640px) {
  .post-detail {
    padding: 12px 12px 32px;

    .title {
      font-size: 22px;
    }
  }
}
</style>
