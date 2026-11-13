<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import formattedCount from "@/utils/formattedCount";
import { formatExactTime } from "@/utils/formatTime";
import pickGlyphChar from "@/utils/glyph";
import {
  Star,
  StarFilled,
  View,
  User,
  Lock,
  Unlock,
  ChatDotRound,
  MoreFilled,
} from "@element-plus/icons-vue";
import HeartIcon from "@/components/icons/HeartIcon.vue";
import { useLike } from "@/composables/useLike";
import { useStar } from "@/composables/useStar";
import { highlightKeyword } from "@/utils/searchHighlight";
import { useUserStore } from "@/stores/user";
import { updatePostPrivacyApi } from "@/api/postApi";
import { ElMessage } from "element-plus";

const props = defineProps({
  /** 帖子数据对象（列表接口返回的原样 item） */
  post: { type: Object, required: true },
  // 入场动画延迟（ms），首页网格用它做级联错峰
  delay: { type: Number, default: 0 },
  // 搜索关键词高亮
  keyword: { type: String, default: "" },
  // 是否展示推荐理由角标（仅首页推荐流启用）
  showRecommendMeta: { type: Boolean, default: false },
  // 是否展示负反馈菜单（仅首页推荐流启用）
  showFeedback: { type: Boolean, default: false },
});

const router = useRouter();

// ---- 点赞：乐观更新 + 失败回滚 + 防双击（逻辑收敛于 useLike） ----
const { liked, likeCount, popTick, toggleLike } = useLike({
  postId: () => props.post.id,
  liked: () => props.post.liked,
  likeCount: () => props.post.likeCount,
});

// ---- 收藏：与点赞同构的乐观更新 ----
const {
  starred,
  starCount,
  popTick: starPopTick,
  toggleStar,
} = useStar({
  postId: () => props.post.id,
  starred: () => props.post.starred,
  starCount: () => props.post.starCount,
});

// ---- 纯文本摘要 ----
const htmlToText = (html) => {
  if (!html) return "";
  const formattedHtml = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  const parser = new DOMParser();
  const doc = parser.parseFromString(formattedHtml, "text/html");
  return doc.body.textContent?.trim() || "";
};

const textContent = computed(() => htmlToText(props.post.content));

const highlightedTitle = computed(() =>
  highlightKeyword(props.post.title, props.keyword),
);
const highlightedExcerpt = computed(() =>
  highlightKeyword(textContent.value, props.keyword),
);

// 文本卡水印字：取标题首个非符号字符，形似书页章纹
const glyph = computed(() => pickGlyphChar(props.post.title));

const timeText = computed(() => formatExactTime(props.post.createTime));

// ---- 封面加载状态：淡入 + 失败回退纯文本卡 ----
const coverLoaded = ref(false);
const coverFailed = ref(false);

watch(
  () => props.post.cover,
  () => {
    coverLoaded.value = false;
    coverFailed.value = false;
  },
);

// 封面加载失败时回退为文本预览卡（章纹水印布局）
const hasCover = computed(
  () => Boolean(props.post.cover) && !coverFailed.value,
);

const emit = defineEmits(["privacyChange", "feedback"]);

const localIsPrivate = ref(Boolean(props.post.isPrivate));
watch(
  () => props.post.isPrivate,
  (val) => {
    localIsPrivate.value = Boolean(val);
  },
);
const isPrivate = computed(() => localIsPrivate.value);

const authorDisplayName = computed(
  () => props.post.nickname || props.post.username || "",
);

const userStore = useUserStore();
const isAuthor = computed(
  () =>
    userStore.userInfo.id &&
    String(userStore.userInfo.id) === String(props.post.userId),
);

const updatingPrivacy = ref(false);
const togglePrivacy = async () => {
  if (updatingPrivacy.value) return;
  updatingPrivacy.value = true;
  try {
    const target = !isPrivate.value;
    const res = await updatePostPrivacyApi(props.post.id, target);
    if (res.data.code === 1) {
      localIsPrivate.value = target;
      emit("privacyChange", { id: props.post.id, isPrivate: target });
      ElMessage.success(target ? "已设为私密，仅自己可见" : "已设为公开");
    }
  } catch {
    ElMessage.error("更新私密状态失败");
  } finally {
    updatingPrivacy.value = false;
  }
};

const openUser = (e) => {
  e?.stopPropagation?.();
  if (props.post.userId) {
    router.push(`/user/${props.post.userId}`);
  }
};

const visibleTags = computed(() =>
  Array.isArray(props.post.tags) ? props.post.tags.slice(0, 3) : [],
);

const firstTag = computed(() => visibleTags.value[0] || null);

const commentCount = computed(() => Number(props.post.commentCount || 0));

const reasonTone = computed(() => {
  const r = props.post.recommendReason || "";
  if (r.includes("拓展")) return "explore";
  if (r.includes("热度") || r.includes("高赞")) return "hot";
  if (r.includes("关注") || r.includes("偏爱") || r.includes("常看")) {
    return "match";
  }
  return "neutral";
});

const openCategory = (e) => {
  e?.stopPropagation?.();
  if (props.post.categoryId) {
    router.push(`/category/${props.post.categoryId}`);
  }
};

const openTag = (tag, e) => {
  e?.stopPropagation?.();
  if (!tag?.name) return;
  router.push({
    path: "/search",
    query: {
      tagId: tag.id || undefined,
      tagName: tag.name,
    },
  });
};

const handleFeedbackCommand = (command) => {
  if (command === "post") {
    emit("feedback", {
      targetType: "POST",
      targetId: props.post.id,
      label: "这条帖子",
      postId: props.post.id,
    });
  } else if (command === "category" && props.post.categoryId) {
    emit("feedback", {
      targetType: "CATEGORY",
      targetId: props.post.categoryId,
      label: `「${props.post.categoryName || "该分类"}」`,
      postId: props.post.id,
    });
  } else if (command === "tag" && firstTag.value?.id) {
    emit("feedback", {
      targetType: "TAG",
      targetId: firstTag.value.id,
      label: `#${firstTag.value.name}`,
      postId: props.post.id,
    });
  } else if (command === "author" && props.post.userId) {
    emit("feedback", {
      targetType: "AUTHOR",
      targetId: props.post.userId,
      label: `作者 ${authorDisplayName.value || ""}`.trim(),
      postId: props.post.id,
    });
  }
};
</script>

<template>
  <div class="postcard" :style="{ '--rise-delay': `${props.delay}ms` }">
    <article class="card">
      <!-- 拉伸链接：覆盖整张卡片作为点击/键盘导航目标 -->
      <RouterLink class="title-link" :to="`/post/${post.id}`">
        <span class="sr-only">{{ post.title }} — 阅读帖子</span>
      </RouterLink>

      <!-- 封面（无图帖子回退为章纹预览块） -->
      <div class="media">
        <img
          v-if="hasCover"
          :src="post.cover"
          :alt="post.title"
          loading="lazy"
          referrerpolicy="no-referrer"
          :class="{ loaded: coverLoaded }"
          @load="coverLoaded = true"
          @error="coverFailed = true"
        />
        <div v-else class="media-fallback">
          <span class="glyph" aria-hidden="true">{{ glyph }}</span>
          <p class="fallback-excerpt" v-html="highlightedExcerpt"></p>
        </div>

        <!-- 封面浮层：浏览量（左）与私密状态（右），仿 B 站信息条 -->
        <div class="media-chips">
          <span class="chip view-chip">
            <el-icon :size="13"><View /></el-icon>
            <span>{{ formattedCount(post.viewCount || 0) }}</span>
          </span>
          <button
            v-if="isAuthor"
            class="chip author-privacy-btn"
            :class="{ 'is-private': isPrivate }"
            type="button"
            :disabled="updatingPrivacy"
            :title="
              isPrivate ? '当前私密，点击设为公开' : '当前公开，点击设为私密'
            "
            @click.stop.prevent="togglePrivacy"
          >
            <el-icon :size="12"
              ><Lock v-if="isPrivate" /><Unlock v-else
            /></el-icon>
            <span>{{ isPrivate ? "私密" : "设为私密" }}</span>
          </button>
          <span v-else-if="isPrivate" class="chip private-chip">
            <el-icon :size="12"><Lock /></el-icon>
            <span>私密</span>
          </span>
        </div>
      </div>

      <div class="body">
        <div
          v-if="
            post.categoryName ||
            (showRecommendMeta && post.recommendReason) ||
            (showFeedback && !isAuthor)
          "
          class="card-top-row"
        >
          <div class="card-badges">
            <button
              v-if="post.categoryName"
              type="button"
              class="category-pill"
              :class="{ clickable: Boolean(post.categoryId) }"
              :title="post.categoryId ? `进入「${post.categoryName}」专栏` : ''"
              @click.stop="openCategory"
            >
              {{ post.categoryName }}
            </button>
            <span
              v-if="showRecommendMeta && post.recommendReason"
              class="reason-pill"
              :class="`tone-${reasonTone}`"
            >
              {{ post.recommendReason }}
            </span>
          </div>

          <el-dropdown
            v-if="showFeedback && !isAuthor"
            trigger="click"
            placement="bottom-end"
            @command="handleFeedbackCommand"
          >
            <button
              type="button"
              class="feedback-trigger"
              title="不感兴趣 / 减少推荐"
              aria-label="调整推荐偏好"
              @click.stop.prevent
            >
              <el-icon :size="13"><MoreFilled /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="post">
                  不看这条帖子
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="post.categoryId && post.categoryName"
                  command="category"
                >
                  减少「{{ post.categoryName }}」推荐
                </el-dropdown-item>
                <el-dropdown-item v-if="firstTag?.id" command="tag">
                  减少 #{{ firstTag.name }} 推荐
                </el-dropdown-item>
                <el-dropdown-item v-if="post.userId" command="author">
                  不再推荐 @{{ authorDisplayName || "该作者" }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <h4 class="title" v-html="highlightedTitle"></h4>

        <div v-if="visibleTags.length" class="card-tags">
          <button
            v-for="tag in visibleTags"
            :key="tag.id || tag.name"
            type="button"
            class="tag-pill"
            :title="`搜索 #${tag.name} 相关帖子`"
            @click.stop="openTag(tag, $event)"
          >
            #{{ tag.name }}
          </button>
        </div>

        <div class="meta">
          <div class="meta-left">
            <span
              v-if="authorDisplayName"
              class="author"
              :class="{ clickable: Boolean(post.userId) }"
              :title="
                post.userId
                  ? `查看 ${authorDisplayName} 的主页`
                  : authorDisplayName
              "
              @click.stop="openUser"
            >
              <el-icon size="12"><User /></el-icon>
              <span class="author-name">{{ authorDisplayName }}</span>
            </span>
            <span class="time" :title="post.createTime">{{ timeText }}</span>
          </div>
          <div class="stats">
            <span v-if="commentCount > 0" class="stat-static" title="评论数">
              <el-icon size="14"><ChatDotRound /></el-icon>
              <span class="count">{{ formattedCount(commentCount) }}</span>
            </span>
            <button
              class="stat-btn is-star"
              type="button"
              :aria-pressed="starred"
              :aria-label="starred ? '取消收藏' : '收藏'"
              :title="starred ? '取消收藏' : '收藏'"
              @click.stop="toggleStar"
            >
              <el-icon
                :key="starPopTick"
                :class="{ pop: starPopTick > 0 && starred }"
                size="15"
                :color="starred ? 'var(--el-color-warning)' : ''"
              >
                <StarFilled v-if="starred" />
                <Star v-else />
              </el-icon>
              <span class="count" :class="{ active: starred }">
                {{ formattedCount(starCount) }}
              </span>
            </button>
            <button
              class="stat-btn is-like"
              type="button"
              :aria-pressed="liked"
              :aria-label="liked ? '取消点赞' : '点赞'"
              :title="liked ? '取消点赞' : '点赞'"
              @click.stop="toggleLike"
            >
              <span
                :key="popTick"
                class="like-glyph"
                :class="{ pop: popTick > 0 && liked }"
                :style="{
                  color: liked ? 'var(--el-color-danger)' : 'currentColor',
                }"
              >
                <HeartIcon :filled="liked" size="15" />
              </span>
              <span class="count" :class="{ active: liked }">
                {{ formattedCount(likeCount) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  height: 100%;
  border-radius: var(--radius-lg);
  animation: fadeInUp 0.45s ease both;
  animation-delay: var(--rise-delay, 0ms);
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--transition-base),
    box-shadow var(--transition-base),
    border-color var(--transition-base);

  .postcard:hover &,
  .postcard:has(.title-link:focus-visible) & {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--el-color-primary-light-7);
  }

  // 按压反馈
  .postcard:active & {
    transform: translateY(-1px) scale(0.995);
    transition-duration: 0.1s;
  }
}

// 拉伸链接：铺满整卡作为点击与键盘目标
.title-link {
  position: absolute;
  inset: 0;
  z-index: 1;
  color: inherit;
  text-decoration: none;
  outline: none;

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: -2px;
    border-radius: var(--radius-lg);
  }
}

// 可交互元素浮在拉伸链接之上，保证各自的点击热区
.author,
.stat-btn,
.category-pill,
.tag-pill,
.feedback-trigger {
  position: relative;
  z-index: 2;
}

// ---- 封面（图卡） ----
.media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-subtle);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    opacity: 0;
    transition:
      opacity 0.45s ease,
      transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);

    // 图片加载完成后淡入，避免“碎图闪现”
    &.loaded {
      opacity: 1;
    }
  }

  .postcard:hover & img {
    transform: scale(1.04);
  }
}

// 无图帖子：章纹水印 + 摘要预览，保持 B 站卡片的统一高度节奏
.media-fallback {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 14px 16px;
  background:
    radial-gradient(
      circle at 85% 15%,
      var(--el-color-primary-light-9),
      transparent 55%
    ),
    var(--bg-subtle);

  .glyph {
    position: absolute;
    right: -6px;
    bottom: -18px;
    font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
    font-size: 96px;
    line-height: 1;
    font-weight: 700;
    color: var(--text-primary);
    opacity: 0.06;
    user-select: none;
    pointer-events: none;
  }

  .fallback-excerpt {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--text-muted);
    word-break: break-word;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;

    :deep(.search-highlight) {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary-dark-2);
      padding: 0 2px;
      border-radius: 2px;
      font-weight: 600;
    }
  }
}

// ---- 封面信息条（仿 B 站左下播放量 / 右下时长角标） ----
.media-chips {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 10px 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
  pointer-events: none;

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #fff;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }

  .private-chip {
    padding: 1px 8px;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.55);
    font-size: 11px;
  }

  .author-privacy-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: #fff;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    pointer-events: auto;
    transition: all var(--transition-fast);

    &:hover {
      background: rgba(0, 0, 0, 0.85);
      border-color: #fff;
      transform: scale(1.02);
    }

    &.is-private {
      background: rgba(230, 162, 60, 0.9);
      border-color: rgba(255, 255, 255, 0.7);

      &:hover {
        background: rgba(230, 162, 60, 1);
      }
    }
  }
}

// ---- 卡片主体 ----
.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 7px;
  padding: 11px 14px 10px;
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 20px;
}

.card-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-light);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.5;
  white-space: nowrap;
  transition: all var(--transition-fast);

  &.clickable {
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
    }
  }
}

.reason-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;

  &.tone-match {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &.tone-hot {
    background: rgba(230, 162, 60, 0.14);
    color: var(--el-color-warning);
  }

  &.tone-explore {
    background: rgba(82, 140, 114, 0.14);
    color: #528c72;
  }

  &.tone-neutral {
    background: var(--bg-muted);
    color: var(--text-muted);
  }
}

.feedback-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-placeholder);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);

  &:hover {
    background: var(--bg-muted);
    color: var(--text-secondary);
  }
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: -1px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  max-width: 112px;
  padding: 1px 7px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-muted);
  font-size: 11px;
  font-family: inherit;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.015em;
  color: var(--text-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--transition-base);

  .postcard:hover & {
    color: var(--el-color-primary);
  }

  :deep(.search-highlight) {
    background: var(--el-color-primary-light-8);
    color: var(--el-color-primary-dark-2);
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 700;
  }
}

// ---- 底栏：作者 + 时间 + 收藏 + 点赞 ----
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  // 卡片变窄（移动端 2 列 / 宽屏 5 列）时让统计项换行，避免挤压作者与时间
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: auto;
  padding-top: 6px;
  border-top: 1px solid var(--border-light);

  .meta-left {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .author {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 11.5px;
    color: var(--text-secondary);
    font-weight: 500;
    max-width: 96px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color var(--transition-fast);

    &.clickable {
      cursor: pointer;

      &:hover {
        color: var(--el-color-primary);
      }
    }

    .author-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .time {
    font-size: 11.5px;
    color: var(--text-placeholder);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    // 换行后仍靠右对齐
    margin-left: auto;
  }

  .stat-static {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 5px;
    color: var(--text-placeholder);
    font-size: 12px;

    .count {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  }

  .stat-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--text-muted);
    font-size: 12px;
    appearance: none;
    background: none;
    border: none;
    margin: -2px;
    padding: 3px 6px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
    transition:
      background var(--transition-fast),
      transform var(--transition-fast);

    &:hover {
      background: var(--bg-muted);
      color: var(--text-body);
    }

    &:active {
      transform: scale(0.92);
    }

    :focus-visible &,
    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 1px;
    }

    .count {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .count.active {
      font-weight: 600;
    }

    &.is-star .count.active {
      color: var(--el-color-warning);
    }

    &.is-like .count.active {
      color: var(--el-color-danger);
    }

    .pop {
      animation: heartBeat 0.5s ease;
    }

    // 心形点赞图标：与 el-icon 同一基线，避免行高跳动
    .like-glyph {
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
  }
}

@media (max-width: 640px) {
  .body {
    padding: 10px 12px 8px;
    gap: 6px;
  }

  .title {
    font-size: 14px;
    line-height: 1.4;
  }

  .media-fallback {
    padding: 10px 12px;

    .glyph {
      font-size: 76px;
      right: -8px;
      bottom: -14px;
    }

    .fallback-excerpt {
      -webkit-line-clamp: 3;
      line-clamp: 3;
    }
  }

  .meta {
    .author {
      max-width: 120px;
      font-size: 12px;
    }

    .time {
      font-size: 11px;
    }

    .stat-btn {
      padding: 4px 6px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .postcard {
    animation: none;
  }

  .media img {
    transition: none;
  }
}
</style>
