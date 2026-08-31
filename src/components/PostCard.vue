<script setup>
import { likeApi } from "@/api/postApi";
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { throttle } from "lodash-es";
import formattedCount from "@/utils/formattedCount";
import { formatExactTime } from "@/utils/formatTime";
import pickGlyphChar from "@/utils/glyph";
import { Star, View, User } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  id: { type: String, default: "" },
  userId: { type: [String, Number], default: "" },
  username: { type: String, default: "" },
  title: { type: String, default: "" },
  cover: { type: String },
  liked: { type: Boolean, default: false },
  content: { type: String, default: "" },
  likeCount: { type: Number, default: 0 },
  time: { type: String, default: "" },
  viewCount: { type: Number, default: 0 },
  // 入场动画延迟（ms），首页网格用它做级联错峰
  delay: { type: Number, default: 0 },
});

const router = useRouter();

// ---- 点赞（乐观更新 + 失败回滚） ----
const likeCount = ref(props.likeCount);
const liked = ref(props.liked);
// 每次成功切到「已点赞」时 +1，触发图标重挂载从而重放心跳动画
const popTick = ref(0);

watch(
  () => props.liked,
  (val) => {
    liked.value = val;
  },
);
watch(
  () => props.likeCount,
  (val) => {
    likeCount.value = val;
  },
);

const handleLike = async () => {
  const oldLiked = liked.value;
  const oldCount = likeCount.value;
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
  if (liked.value) popTick.value += 1;
  try {
    const res = await likeApi(props.id);
    if (res.data.code !== 1) throw new Error("操作失败");
    ElMessage.success(res.data.message);
  } catch {
    liked.value = oldLiked;
    likeCount.value = oldCount;
  }
};

const like = throttle(handleLike, 800);

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

const textContent = computed(() => htmlToText(props.content));

// 文本卡水印字：取标题首个非符号字符，形似书页章纹
const glyph = computed(() => pickGlyphChar(props.title));

const timeText = computed(() => formatExactTime(props.time));

// ---- 封面加载状态：淡入 + 失败回退纯文本卡 ----
const coverLoaded = ref(false);
const coverFailed = ref(false);

watch(
  () => props.cover,
  () => {
    coverLoaded.value = false;
    coverFailed.value = false;
  },
);

// 封面加载失败时回退为纯文本卡片（章纹水印布局）
const hasCover = computed(() => Boolean(props.cover) && !coverFailed.value);

const openPost = () => router.push(`/post/${props.id}`);
const openUser = (e) => {
  e?.stopPropagation?.();
  if (props.userId) {
    router.push(`/user/${props.userId}`);
  }
};
</script>

<template>
  <div
    class="postcard"
    role="link"
    tabindex="0"
    :aria-label="`阅读帖子：${props.title}`"
    :style="{ '--rise-delay': `${props.delay}ms` }"
    @click="openPost"
    @keydown.enter.prevent="openPost"
  >
    <article class="card">
      <div v-if="hasCover" class="media">
        <img
          :src="props.cover"
          :alt="props.title"
          loading="lazy"
          referrerpolicy="no-referrer"
          :class="{ loaded: coverLoaded }"
          @load="coverLoaded = true"
          @error="coverFailed = true"
        />
      </div>

      <div class="body">
        <h4 class="title">{{ props.title }}</h4>

        <p v-if="hasCover" class="excerpt">{{ textContent }}</p>

        <div v-else class="text-wrap">
          <span class="glyph" aria-hidden="true">{{ glyph }}</span>
          <p class="excerpt text-content">{{ textContent }}</p>
        </div>

        <div class="meta">
          <div class="meta-left">
            <span
              v-if="props.username"
              class="author"
              :class="{ clickable: Boolean(props.userId) }"
              :title="
                props.userId
                  ? `查看 @${props.username} 的主页`
                  : `@${props.username}`
              "
              @click.stop="openUser"
            >
              <el-icon size="12"><User /></el-icon>
              <span class="author-name">@{{ props.username }}</span>
            </span>
            <span class="time" :title="props.time">{{ timeText }}</span>
          </div>
          <div class="stats">
            <span class="view">
              <el-icon size="14"><View /></el-icon>
              <span class="count">{{ formattedCount(props.viewCount) }}</span>
            </span>
            <button
              class="like"
              type="button"
              :aria-pressed="liked"
              :aria-label="liked ? '取消点赞' : '点赞'"
              @click.stop="like"
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
  cursor: pointer;
  border-radius: var(--radius-lg);
  animation: fadeInUp 0.45s ease both;
  animation-delay: var(--rise-delay, 0ms);

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}

.card {
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
  .postcard:focus-visible & {
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

// ---- 封面（图卡） ----
.media {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--bg-subtle);
  position: relative;

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

// ---- 卡片主体 ----
.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 8px;
  padding: 14px 16px 12px;
}

.title {
  margin: 0;
  font-size: 15.5px;
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
}

.excerpt {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-muted);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// ---- 文本卡：章纹水印 + 长摘要 ----
.text-wrap {
  position: relative;
  flex: 1;
  min-height: 150px;

  .glyph {
    position: absolute;
    right: -12px;
    bottom: -24px;
    font-family: "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
    font-size: 110px;
    line-height: 1;
    font-weight: 700;
    color: var(--text-primary);
    opacity: 0.05;
    user-select: none;
    pointer-events: none;
  }

  .text-content {
    white-space: pre-wrap;
    -webkit-line-clamp: 7;
    line-clamp: 7;
    min-height: 140px;
  }
}

// ---- 底栏：作者 + 时间 + 浏览 + 点赞 ----
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
    gap: 8px;
    flex-shrink: 0;
  }

  .view,
  .like {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--text-muted);
    font-size: 12px;
  }

  .count {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .like {
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
      background: var(--el-color-danger-light-9);
      color: var(--el-color-danger);
    }

    &:active {
      transform: scale(0.92);
    }

    :focus-visible &,
    &:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 1px;
    }

    .count.active {
      color: var(--el-color-danger);
      font-weight: 600;
    }

    .pop {
      animation: heartBeat 0.5s ease;
    }
  }
}

@media (max-width: 640px) {
  .body {
    padding: 12px 14px 10px;
    gap: 6px;
  }

  .title {
    font-size: 15px;
    line-height: 1.4;
  }

  .excerpt {
    font-size: 12.5px;
  }

  .text-wrap {
    min-height: 120px;

    .glyph {
      font-size: 88px;
      right: -8px;
      bottom: -16px;
    }

    .text-content {
      min-height: 110px;
      -webkit-line-clamp: 5;
      line-clamp: 5;
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

    .like {
      padding: 4px 8px;
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
