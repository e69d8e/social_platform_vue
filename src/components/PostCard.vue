<script setup>
import { likeApi } from "@/api/postApi";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { throttle } from "lodash";
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
const { title, imgUrl, content, time } = props;
const count = ref(props.count);
const liked = ref(props.liked);
const router = useRouter();
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
// 节流
const like = throttle(handleLike, 800);
const toPostDetail = () => {
  router.push(`/post/${props.id}`);
};
</script>

<template>
  <div class="postcard">
    <el-card style="">
      <template #header>
        <div>
          <div class="header">
            {{ title }}
            <div class="like">
              <el-icon
                @click="like"
                class="star"
                size="large"
                :color="liked ? 'red' : ''"
                ><Star
              /></el-icon>
              <el-text style="margin-left: 3px" size="large" type="primary">{{
                count
              }}</el-text>
            </div>
          </div>
          <div class="time pointer" @click="toPostDetail()">
            <el-text type="primary">{{ time }}</el-text>
          </div>
        </div>
      </template>
      <div>
        <img
          class="pointer"
          :src="imgUrl"
          shadow="hover"
          style="width: 100%"
          @click="toPostDetail()"
        />
      </div>
      <template #footer>
        <div class="content pointer" @click="toPostDetail()">
          {{ content }}
        </div>
      </template>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  .pointer {
    cursor: pointer;
  }
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
