<script setup>
import { likeApi } from "@/api/postApi";
import { ref } from "vue";
import { throttle } from "lodash";
import formattedCount from "@/utils/formattedCount";
import { Star, View } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  id: { type: String, default: "" },
  title: { type: String, default: "title" },
  cover: { type: String },
  liked: { type: Boolean, default: false },
  content: { type: String, default: "" },
  likeCount: { type: Number, default: 0 },
  time: { type: String, default: "2023-05-05 00:00:00" },
  viewCount: { type: Number, default: 0 },
});

const likeCount = ref(props.likeCount);
const liked = ref(props.liked);

const handleLike = async () => {
  const oldLiked = liked.value;
  const oldCount = likeCount.value;
  liked.value = !liked.value;
  likeCount.value += liked.value ? 1 : -1;
  try {
    const res = await likeApi(props.id);
    ElMessage.success(res.data.message);
  } catch {
    liked.value = oldLiked;
    likeCount.value = oldCount;
  }
};

const like = throttle(handleLike, 800);

const htmlToText = (html) => {
  const formattedHtml = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  const parser = new DOMParser();
  const doc = parser.parseFromString(formattedHtml, "text/html");
  return doc.body.textContent?.trim() || "";
};
</script>

<template>
  <div class="postcard" @click="$router.push(`/post/${props.id}`)">
    <el-card shadow="hover" class="card">
      <template #header>
        <div class="card-header">
          <h4 class="card-title">{{ props.title }}</h4>
          <div class="like" @click.stop="like">
            <el-icon
              size="18"
              :color="liked ? 'var(--el-color-danger)' : ''"
              ><Star
            /></el-icon>
            <span class="count">{{ formattedCount(likeCount) }}</span>
          </div>
        </div>
        <div class="card-meta">
          <span class="time">{{ props.time }}</span>
          <div class="view">
            <el-icon size="16"><View /></el-icon>
            <span class="count">{{ formattedCount(props.viewCount) }}</span>
          </div>
        </div>
      </template>

      <div v-if="props.cover" class="cover">
        <img :src="props.cover" />
      </div>
      <div v-else class="text-content">
        {{ htmlToText(props.content) }}
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  cursor: pointer;

  .card {
    border-radius: $radius-lg;
    overflow: hidden;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-sm);
    transition: all $transition-base;

    &:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    :deep(.el-card__header) {
      padding: 14px 16px 8px;
      border-bottom: none;
    }

    :deep(.el-card__body) {
      padding: 0 16px 16px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    margin-right: 8px;
    color: var(--text-primary);
  }

  .card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;

    .time {
      font-size: 12px;
      color: var(--text-placeholder);
    }
  }

  .like,
  .view {
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
  }

  .like {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: $radius-sm;
    transition: all $transition-base;

    &:hover {
      background: var(--el-color-danger-light-9);
    }
  }

  .count {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .cover {
    border-radius: $radius-md;
    overflow: hidden;

    img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
  }

  &:hover .cover img {
    transform: scale(1.03);
  }

  .text-content {
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-wrap: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 8;
    line-clamp: 8;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 160px;
  }
}
</style>
