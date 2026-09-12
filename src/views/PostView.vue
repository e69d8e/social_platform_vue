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
  Share,
  ChatDotRound,
  Loading,
  Picture,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

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
const deleteLoading = ref(false);

// ---- 图片大图预览逻辑 ----
const viewerVisible = ref(false);
const viewerIndex = ref(0);

const contentImageList = computed(() => {
  if (!sanitizedContent.value) return [];
  const urls = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(sanitizedContent.value)) !== null) {
    if (match[1]) urls.push(match[1]);
  }
  return urls;
});

const allImages = computed(() => {
  const list = [];
  if (post.value.cover) list.push(post.value.cover);
  list.push(...contentImageList.value);
  return list;
});

const handleContentClick = (e) => {
  const target = e.target;
  if (target && target.tagName === "IMG") {
    const src = target.getAttribute("src");
    if (!src) return;
    const index = allImages.value.indexOf(src);
    openViewer(index >= 0 ? index : 0);
  }
};

const openViewer = (index = 0) => {
  viewerIndex.value = index;
  viewerVisible.value = true;
};

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
  if (!userStore.userInfo?.username) {
    ElMessage.info("请先登录后再点赞");
    router.push("/login");
    return;
  }
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
    ElMessage.success(
      res.data.message || (post.value.liked ? "点赞成功" : "已取消点赞"),
    );
  } catch {
    post.value.liked = oldLiked;
    post.value.likeCount = oldCount;
    ElMessage.error("操作失败，请重试");
  } finally {
    likeLoading.value = false;
  }
}, 800);

const copyPostLink = () => {
  const url = window.location.href;
  navigator.clipboard?.writeText(url).then(
    () => ElMessage.success("链接已复制，去分享给好友吧！"),
    () => ElMessage.error("复制链接失败"),
  );
};

const scrollToComments = () => {
  const el = document.querySelector(".comment-section");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const deletePost = async () => {
  deleteLoading.value = true;
  try {
    const res = await deletePostApi(post.value.id);
    if (res.data.code === 1) ElMessage.success(res.data.message);
    dialogVisible.value = false;
    router.back();
  } catch {
    ElMessage.error("删除失败，请重试");
  } finally {
    deleteLoading.value = false;
  }
};

const banPost = async () => {
  try {
    const id = post.value?.id || route.params.id;
    const res = await banPostApi(id);
    if (res.data.code === 1) {
      ElMessage.success(
        res.data.message || (post.value.enabled ? "封禁成功" : "解封成功"),
      );
    }
    router.back();
  } catch {
    ElMessage.error("操作失败，请重试");
  }
};

// 保证富文本中第三方图片均附带 referrerpolicy="no-referrer" 绕过防盗链
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "IMG") {
    node.setAttribute("referrerpolicy", "no-referrer");
    if (!node.hasAttribute("loading")) {
      node.setAttribute("loading", "lazy");
    }
  }
});

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
              v-if="userStore.userInfo.id && String(userStore.userInfo.id) === String(post.userId)"
              title="删除作品"
              class="admin-icon"
              @click="dialogVisible = true"
              ><Delete
            /></el-icon>
            <el-popconfirm
              v-if="[2, 3].includes(userStore.userInfo.authorityId) || ['REVIEWER', 'ADMIN'].includes(userStore.userInfo.authority)"
              :title="post.enabled ? '确定封禁该文章吗？' : '确定解封该文章吗？'"
              @confirm="banPost"
            >
              <template #reference>
                <el-icon
                  :title="post.enabled ? '封禁文章' : '解封文章'"
                  class="admin-icon"
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
              class="action-pill"
              type="button"
              title="复制帖子链接"
              @click="copyPostLink"
            >
              <el-icon size="15"><Share /></el-icon>
              <span>分享</span>
            </button>
            <button
              class="action-pill"
              type="button"
              title="查看评论"
              @click="scrollToComments"
            >
              <el-icon size="15"><ChatDotRound /></el-icon>
              <span>评论</span>
            </button>
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

      <div v-if="post.cover" class="cover" @click="openViewer(0)">
        <el-image
          :src="post.cover"
          fit="cover"
          class="cover-img"
          alt="文章封面"
          referrerpolicy="no-referrer"
          loading="lazy"
        >
          <template #placeholder>
            <div class="image-slot loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>图片加载中…</span>
            </div>
          </template>
          <template #error>
            <div class="image-slot error">
              <el-icon size="24"><Picture /></el-icon>
              <span>图片加载失败（可能网络超时或外链失效）</span>
            </div>
          </template>
        </el-image>
      </div>

      <div class="rule"></div>

      <div
        class="content"
        v-html="sanitizedContent"
        @click="handleContentClick"
      ></div>

      <!-- 章纹收尾：读完一章的落款 -->
      <footer class="paper-end">
        <span class="end-rule"></span>
        <span class="end-seal" aria-hidden="true">{{ glyph }}</span>
        <span class="end-rule"></span>
      </footer>
    </article>

    <el-dialog v-model="dialogVisible" title="确认删除作品?" width="min(90vw, 400px)" center>
      <p
        style="
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 8px;
        "
      >
        删除后作品将无法恢复，确定继续吗？
      </p>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deleteLoading" @click="deletePost"
          >确认删除</el-button
        >
      </template>
    </el-dialog>

    <CommentComponent :post-id="route.params.id" />

    <!-- 帖子正文图片大图全屏预览 -->
    <el-image-viewer
      v-if="viewerVisible"
      :url-list="allImages"
      :initial-index="viewerIndex"
      :teleported="true"
      :hide-on-click-modal="true"
      @close="viewerVisible = false"
    />
  </div>
</template>

<style lang="scss" scoped>
.post-detail {
  max-width: 860px;
  margin: 0 auto;
  padding: 16px 16px 100px;

  .back-margin {
    margin-bottom: 16px;
  }

  // ---- 阅读纸面 ----
  .paper {
    position: relative;
    overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
    padding: 40px 48px 36px;
    animation: fadeInUp 0.4s ease both;

    // 标题首字章纹，藏在纸面右上角
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

    .paper-head {
      position: relative;

      .category-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 14px;
        margin-bottom: 16px;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
        border: 1px solid var(--el-color-primary-light-7);
        border-radius: var(--radius-full);

        &::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--el-color-primary);
        }
      }

      .title {
        margin: 0 0 20px;
        font-size: 28px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.02em;
        color: var(--text-ink);
        word-break: break-word;
      }

      // ---- 署名行 ----
      .byline {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 6px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--border-light);

        .author {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;

          .author-avatar {
            flex-shrink: 0;
            border: 2px solid var(--border-light);
            cursor: pointer;
            transition: transform var(--transition-base);

            &:hover {
              transform: scale(1.05);
            }
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
            transition: color var(--transition-base);
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
              transform var(--transition-fast),
              opacity var(--transition-fast);

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

          .action-pill {
            appearance: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 14px;
            font-size: 13px;
            font-family: inherit;
            color: var(--text-secondary);
            background: var(--bg-subtle);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-full);
            cursor: pointer;
            transition: all var(--transition-base);

            &:hover {
              border-color: var(--el-color-primary-light-7);
              color: var(--el-color-primary);
              background: var(--el-color-primary-light-9);
            }

            &:active {
              transform: scale(0.95);
            }
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
            border-radius: var(--radius-full);
            cursor: pointer;
            transition: all var(--transition-base);

            &:hover {
              border-color: var(--el-color-danger-light-7);
              color: var(--el-color-danger);
              background: var(--el-color-danger-light-9);
            }

            &.liked {
              background: var(--el-color-danger);
              border-color: var(--el-color-danger);
              color: #fff;
              box-shadow: 0 2px 10px rgba(194, 76, 76, 0.3);
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
      }
    }

    // ---- 封面 ----
    .cover {
      margin: 20px 0 10px;
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      cursor: zoom-in;
      transition: all var(--transition-base);

      &:hover {
        opacity: 0.95;
        box-shadow: var(--shadow-md);
      }

      .cover-img {
        width: 100%;
        aspect-ratio: 16 / 9;
        display: block;
        object-fit: cover;
      }

      .image-slot {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-height: 220px;
        background: var(--bg-subtle);
        color: var(--text-placeholder);
        font-size: 13px;
        gap: 8px;

        &.loading {
          color: var(--text-secondary);
        }

        &.error {
          color: var(--text-placeholder);
        }
      }
    }

    .rule {
      border-top: 1px solid var(--border-light);
      margin: 24px 0;
    }

    // ---- 正文排版 ----
    .content {
      overflow: hidden;
      font-size: 16px;
      line-height: 1.85;
      color: var(--text-body);
      letter-spacing: 0.01em;

      :deep(p) {
        margin-bottom: 1.25em;
      }

      :deep(h1),
      :deep(h2),
      :deep(h3),
      :deep(h4) {
        color: var(--text-ink);
        font-weight: 700;
        margin: 1.6em 0 0.8em;
        letter-spacing: -0.015em;
      }

      :deep(img) {
        max-width: 100%;
        height: auto;
        border-radius: var(--radius-lg);
        margin: 16px 0;
        box-shadow: var(--shadow-sm);
        cursor: zoom-in;
        transition:
          transform var(--transition-base),
          box-shadow var(--transition-base),
          opacity var(--transition-base);

        &:hover {
          opacity: 0.94;
          box-shadow: var(--shadow-md);
        }

        &:active {
          transform: scale(0.99);
        }
      }

      :deep(blockquote) {
        margin: 16px 0;
        padding: 12px 18px;
        border-left: 4px solid var(--el-color-primary);
        background: var(--bg-subtle);
        border-radius: 0 var(--radius-md) var(--radius-md) 0;
        color: var(--text-secondary);
        font-style: italic;
      }

      :deep(pre) {
        background: var(--surface-dark-elevated);
        color: var(--color-on-dark);
        padding: 16px 20px;
        border-radius: var(--radius-md);
        overflow-x: auto;
        margin: 16px 0;
        font-size: 13.5px;
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
        border-radius: var(--radius-sm);
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
}

@media (max-width: 640px) {
  .post-detail {
    padding: 10px 8px calc(90px + env(safe-area-inset-bottom, 0px));

    .paper {
      padding: 20px 14px 20px;
      border-radius: var(--radius-lg);

      .paper-glyph {
        font-size: 130px;
        right: 4px;
        top: 4px;
      }
    }

    .paper-head .title {
      font-size: 20px;
      margin-bottom: 14px;
    }

    .paper-head .byline {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .author {
        width: 100%;
        flex-wrap: wrap;
        gap: 8px;

        .author-avatar {
          width: 38px !important;
          height: 38px !important;
        }

        .nickname {
          font-size: 14px;
          max-width: 130px;
        }
      }

      .stats-bar {
        width: 100%;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 6px;
        padding-bottom: 0;

        .action-pill,
        .like-pill {
          padding: 5px 12px;
          font-size: 12px;
        }
      }
    }

    .cover {
      margin: 14px 0 8px;
      border-radius: var(--radius-lg);
    }

    .content {
      font-size: 15px;
      line-height: 1.75;

      :deep(pre) {
        padding: 12px 14px;
        font-size: 12.5px;
        border-radius: var(--radius-sm);
      }

      :deep(blockquote) {
        padding: 10px 14px;
        margin: 12px 0;
      }

      :deep(table) {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
    }

    .paper-end {
      margin-top: 28px;
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
