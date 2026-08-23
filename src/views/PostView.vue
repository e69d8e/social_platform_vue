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
import { formatExactTime } from "@/utils/formatTime";
import pickGlyphChar from "@/utils/glyph";
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
  if (post.value.liked) likePop.value += 1;
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

// 文章头部章纹水印，取标题首字（空标题退回首字为「文」）
const glyph = computed(() => pickGlyphChar(post.value.title));
// 点赞心跳：切到已赞时 +1 触发图标重挂载重放心跳动画
const likePop = ref(0);
const timeText = computed(() => formatExactTime(post.value.createTime));
</script>

<template>
  <div class="post-detail" v-loading="loading">
    <BackButton class="back-margin" />

    <!-- 阅读纸面：详情页主体像一张按在页面上的暖色纸卡 -->
    <article class="paper">
      <span class="paper-glyph" aria-hidden="true">{{ glyph }}</span>

      <header class="paper-head">
        <div v-if="post.category" class="category-chip">
          {{ post.category }}
        </div>
        <h1 class="title">{{ post.title }}</h1>

        <div class="byline">
          <div class="author">
            <el-avatar
              :size="44"
              :src="post.avatar"
              class="author-avatar"
              @click="$router.push('/user/' + post.userId)"
            />
            <div class="author-col">
              <span
                class="nickname"
                @click="$router.push('/user/' + post.userId)"
                >{{ post.nickname }}</span
              >
              <span class="publish-time" :title="post.createTime">{{
                timeText
              }}</span>
            </div>
            <FollowButton
              :user-id="post.userId"
              :followed="post.followed"
              size="small"
              :round="true"
            />
            <el-icon
              v-if="String(userStore.userInfo.id) === String(post.userId)"
              title="删除作品"
              class="admin-icon"
              @click="dialogVisible = true"
              ><Delete
            /></el-icon>
            <el-popconfirm
              v-if="userStore.userInfo.authorityId === 3"
              title="确定封禁/解封该文章吗？"
              @confirm="banPost"
            >
              <template #reference>
                <el-icon title="封禁文章" class="admin-icon"
                  ><RemoveFilled
                /></el-icon>
              </template>
            </el-popconfirm>
          </div>

          <div class="stats-bar">
            <span class="view-stat">
              <el-icon size="16"><View /></el-icon>
              <span>{{ viewCount }} 浏览</span>
            </span>
            <button
              class="like-pill"
              :class="{ liked: post.liked }"
              type="button"
              :aria-pressed="post.liked"
              @click="toggleLike"
            >
              <el-icon
                :key="likePop"
                :class="{ pop: likePop > 0 && post.liked }"
                size="16"
              >
                <StarFilled v-if="post.liked" />
                <Star v-else />
              </el-icon>
              <span>{{ post.liked ? "已赞 " : "点赞 " }}{{ likeCount }}</span>
            </button>
          </div>
        </div>
      </header>

      <div v-if="post.cover" class="cover">
        <el-image
          :preview-src-list="srcList"
          :src="post.cover"
          fit="cover"
          class="cover-img"
        />
      </div>

      <div class="rule"></div>

      <div class="content" v-html="sanitizedContent"></div>

      <!-- 章纹收尾：读完一章的落款 -->
      <footer class="paper-end">
        <span class="end-rule"></span>
        <span class="end-seal" aria-hidden="true">{{ glyph }}</span>
        <span class="end-rule"></span>
      </footer>
    </article>

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
  padding: 16px 16px 48px;

  .back-margin {
    margin-bottom: 16px;
  }

  // ---- 阅读纸面 ----
  .paper {
    position: relative;
    overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: $radius-xl;
    box-shadow: var(--shadow-sm);
    padding: 40px 48px 36px;
    animation: fadeInUp 0.4s ease both;

    // 标题首字章纹，藏在纸面右上角（与首页文本卡同源）
    .paper-glyph {
      position: absolute;
      top: 8px;
      right: 20px;
      font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
      font-size: 240px;
      line-height: 1;
      font-weight: 700;
      color: var(--text-primary);
      opacity: 0.045;
      user-select: none;
      pointer-events: none;
    }
  }

  .paper-head {
    position: relative;

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 12px;
      margin-bottom: 14px;
      font-size: 12px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border: 1px solid var(--el-color-primary-light-7);
      border-radius: $radius-full;

      &::before {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--el-color-primary);
      }
    }

    .title {
      margin: 0 0 20px;
      font-size: 27px;
      font-weight: 700;
      line-height: 1.42;
      letter-spacing: 0.01em;
      color: var(--text-primary);
      word-break: break-word;
    }
  }

  // ---- 署名行 ----
  .byline {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }

  .author {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    .author-avatar {
      flex-shrink: 0;
      border: 2px solid transparent;
      background-image: var(--gradient-primary);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      cursor: pointer;
    }

    .author-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .nickname {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      cursor: pointer;
      transition: color $transition-base;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    .publish-time {
      font-size: 12px;
      color: var(--text-placeholder);
    }

    .admin-icon {
      font-size: 20px;
      color: var(--el-color-danger);
      cursor: pointer;
      transition:
        transform $transition-fast,
        opacity $transition-fast;

      &:hover {
        opacity: 0.7;
        transform: scale(1.1);
      }
    }
  }

  // ---- 浏览 + 点赞胶囊 ----
  .stats-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding-bottom: 4px;

    .view-stat {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .like-pill {
      appearance: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 18px;
      font-size: 13px;
      font-family: inherit;
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border: 1px solid var(--border-light);
      border-radius: $radius-full;
      cursor: pointer;
      transition: all $transition-base;

      &:hover {
        border-color: var(--el-color-danger-light-7);
        color: var(--el-color-danger);
        background: var(--el-color-danger-light-9);
      }

      &.liked {
        background: var(--el-color-danger);
        border-color: var(--el-color-danger);
        color: #fff;
        box-shadow: var(--shadow-sm);
      }

      &:active {
        transform: scale(0.95);
      }

      &:focus-visible {
        outline: 2px solid var(--border-focus);
        outline-offset: 2px;
      }

      .pop {
        animation: heartBeat 0.5s ease;
      }
    }
  }

  // ---- 封面 ----
  .cover {
    margin: 16px 0 4px;
    border-radius: $radius-lg;
    overflow: hidden;

    .cover-img {
      width: 100%;
      aspect-ratio: 16 / 9;
      display: block;
      object-fit: cover;
    }
  }

  .rule {
    border-top: 1px solid var(--border-light);
    margin: 28px 0 24px;
  }

  // ---- 正文排版 ----
  .content {
    overflow: hidden;
    font-size: 15.5px;
    line-height: 1.9;
    color: var(--text-body);
    word-break: break-word;

    :deep(p) {
      margin: 0 0 1em;
    }

    :deep(p:last-child) {
      margin-bottom: 0;
    }

    :deep(img) {
      max-width: 100%;
      border-radius: $radius-md;
    }

    :deep(a) {
      color: var(--el-color-primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }

  // ---- 章纹收尾 ----
  .paper-end {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 40px;

    .end-rule {
      width: 64px;
      height: 1px;
      background: var(--border-light);
    }

    .end-seal {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: $radius-sm;
      background-image: var(--gradient-primary);
      box-shadow: var(--shadow-sm);
      font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      user-select: none;
    }
  }
}

@media (max-width: 640px) {
  .post-detail {
    padding: 12px 12px 36px;

    .paper {
      padding: 24px 16px 24px;

      .paper-glyph {
        font-size: 150px;
        right: 6px;
      }
    }

    .paper-head .title {
      font-size: 21px;
    }

    .byline {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .stats-bar {
        padding-bottom: 0;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper {
    animation: none;
  }

  .like-pill,
  .admin-icon,
  .nickname {
    transition: none;
  }
}
</style>
