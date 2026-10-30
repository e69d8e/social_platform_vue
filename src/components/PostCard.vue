<script setup>
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import formattedCount from "@/utils/formattedCount";
import { formatExactTime } from "@/utils/formatTime";
import pickGlyphChar from "@/utils/glyph";
import { Star, View, User, Lock, Unlock } from "@element-plus/icons-vue";
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

const emit = defineEmits(["privacyChange"]);

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
        <h4 class="title" v-html="highlightedTitle"></h4>

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
            <button
              class="stat-btn"
              type="button"
              :aria-pressed="starred"
              :aria-label="starred ? '取消收藏' : '收藏'"
              title="收藏"
              @click.stop="toggleStar"
            >
              <el-icon
                :key="starPopTick"
                :class="{ pop: starPopTick > 0 && starred }"
                size="15"
                :color="starred ? 'var(--el-color-warning)' : ''"
              >
                <Star />
              </el-icon>
              <span class="count" :class="{ active: starred }">
                {{ formattedCount(starCount) }}
              </span>
            </button>
            <button
              class="stat-btn"
              type="button"
              :aria-pressed="liked"
              :aria-label="liked ? '取消点赞' : '点赞'"
              title="点赞"
              @click.stop="toggleLike"
            >
              <el-icon
                :key="popTick"
                :class="{ pop: popTick > 0 && liked }"
                size="15"
                :color="liked ? 'var(--el-color-danger)' : ''"
              >
                <Star />
              </el-icon>
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
.stat-btn {
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
  gap: 8px;
  padding: 12px 14px 10px;
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
  gap: 8px;
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

    // 收藏按钮在首位、点赞按钮居次，激活色分别呼应图标色
    &:first-child .count.active {
      color: var(--el-color-warning);
    }

    &:nth-child(2) .count.active {
      color: var(--el-color-danger);
    }

    .pop {
      animation: heartBeat 0.5s ease;
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
