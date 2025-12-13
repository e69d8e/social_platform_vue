<script setup>
import { likeApi } from "@/api/postApi";
import { ref } from "vue";
const props = defineProps({
  id: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "title",
  },
  imgUrl: {
    type: String,
    default: "http://localhost:8080/imgs/post/default.jpg",
  },
  content: {
    type: String,
    default: "content",
  },
  liked: {
    type: Boolean,
    default: false,
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
const count = ref(props.count);
const liked = ref(props.liked);
const like = async () => {
  if (liked.value) {
    count.value--;
    liked.value = false;
  } else {
    count.value++;
    liked.value = true;
  }
  const res = await likeApi(props.id);
  // eslint-disable-next-line no-undef
  ElMessage({
    message: res.data.message,
    type: "success",
  });
};
</script>

<template>
  <div class="postcard">
    <el-card style="">
      <template #header>
        <div class="header">
          {{ props.title }}
          <div class="like">
            <el-icon
              @click="like"
              class="star"
              size="large"
              :color="liked ? 'red' : '  '"
              ><Star
            /></el-icon>
            <el-text style="margin-left: 3px" size="large" type="primary">{{
              count
            }}</el-text>
          </div>
        </div>
        <div class="time">
          <el-text type="primary">{{ props.time }}</el-text>
        </div>
      </template>
      <img :src="props.imgUrl" shadow="hover" style="width: 100%" />
      <template #footer>
        <div class="content">
          {{ props.content }}
        </div>
      </template>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  width: 280px;
  .header {
    .star:hover {
      cursor: pointer;
    }
    display: flex;
    justify-content: space-between;
    align-items: center;
    .like {
      display: flex;
      align-items: center;
    }
  }
  .time {
    margin-top: 10px;
    display: flex;
    justify-content: flex-start;
  }
  .content {
    text-align: left;
    // 限制显示一行内容
    white-space: nowrap; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    width: 100%; /* 需要指定宽度 */
  }
}
@keyframes grow {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.05);
  }
}
@keyframes shrink {
  0% {
    transform: scale(1.05);
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
