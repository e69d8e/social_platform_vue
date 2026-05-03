<script setup>
import { likeApi } from "@/api/postApi";
import { ref, computed } from "vue";
import { throttle } from "lodash";
import formattedCount from "@/utils/formattedCount";
const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "title",
  },
  cover: {
    type: String,
  },
  liked: {
    type: Boolean,
    default: false,
  },
  content: {
    type: String,
    default: "",
  },
  count: {
    type: Number,
    default: 0,
  },
  time: {
    type: String,
    default: "2023-05-05 00:00:00",
  },
});
const { title, cover, time } = props;
const count = ref(props.count);
const liked = ref(props.liked);
const handleLike = async () => {
  const oldLiked = liked.value;
  const oldCount = count.value;

  liked.value = !liked.value;
  count.value += liked.value ? 1 : -1;

  try {
    const res = await likeApi(props.id);
    // eslint-disable-next-line no-undef
    ElMessage.success(res.data.message);
  } catch (e) {
    liked.value = oldLiked;
    count.value = oldCount;
    console.log(e);
    // eslint-disable-next-line no-undef
    ElMessage.error("操作失败");
  }
};
const likedCount = computed(() => {
  return formattedCount(count.value);
});
// 节流
const like = throttle(handleLike, 800);
const htmlToText = (html) => {
  // 可选：提前将常见块级标签替换为换行，保留基础排版
  const formattedHtml = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");

  // 使用 DOMParser 安全解析（不会执行 script）
  const parser = new DOMParser();
  const doc = parser.parseFromString(formattedHtml, "text/html");
  return doc.body.textContent?.trim() || "";
};
</script>

<template>
  <div class="postcard">
    <el-card
      header-class="card-header"
      body-class="card-body"
      class="pointer"
      @click="$router.push(`/post/${props.id}`)"
    >
      <template #header>
        <div>
          <div class="title">
            <h4>{{ title }}</h4>
            <div class="like">
              <el-icon
                @click.stop="like"
                class="star"
                size="large"
                :color="liked ? 'red' : ''"
                ><Star
              /></el-icon>
              <el-text style="margin-left: 3px" size="small" type="primary">{{
                likedCount
              }}</el-text>
            </div>
          </div>
          <div class="time">
            <el-text size="small" type="primary">{{ time }}</el-text>
          </div>
        </div>
      </template>
      <div class="img">
        <div v-if="cover">
          <img
            :src="cover"
            shadow="hover"
            style="width: 100%; aspect-ratio: 5 / 3"
          />
          <!-- <el-image style="width: 100px; height: 100px" :src="url" :fit="fit" /> -->
        </div>
        <div class="content" v-else>
          <el-text
            style="white-space: pre-wrap; word-wrap: break-word; height: 200px"
            size="small"
            type="info"
          >
            {{ htmlToText(content) }}
          </el-text>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  width: 100%;
  margin-bottom: 10px;
  .pointer {
    cursor: pointer;
  }

  .title {
    height: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    h4 {
      white-space: nowrap; /* 强制文本不换行 */
      overflow: hidden; /* 隐藏溢出内容 */
      text-overflow: ellipsis; /* 显示省略号 */
      width: 75%; /* 需要指定宽度 */
    }
    .like {
      display: flex;
      align-items: center;
    }
  }
  .time {
    display: flex;
    justify-content: flex-start;
  }
  .img {
    height: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@keyframes grow {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.03);
  }
}
@keyframes shrink {
  0% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}
.postcard:hover {
  animation: grow 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
.postcard:not(:hover) {
  animation: shrink 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
</style>

<style>
.card-body {
  padding: 10px;
}
.card-header {
  padding: 10px;
}
</style>
