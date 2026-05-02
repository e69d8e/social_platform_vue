<script setup>
import { likeApi } from "@/api/postApi";
import { ref, computed } from "vue";
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
  cover: {
    type: String,
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
const { title, cover, time } = props;
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
const formattedCount = computed(() => {
  if (count.value >= 1000 && count.value < 1000000) {
    const qian = count.value / 1000;
    // 保留两位小数，避免过多小数位
    return `${qian.toFixed(1)} k`;
  } else if (count.value >= 1000000) {
    const wan = count.value / 1000000;
    // 保留两位小数，避免过多小数位
    return `${wan.toFixed(1)} w`;
  }
  return count.value.toString();
});
// 节流
const like = throttle(handleLike, 800);
</script>

<template>
  <div class="postcard">
    <el-card class="pointer" @click="router.push(`/post/${props.id}`)">
      <template #header>
        <div>
          <div class="header">
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
                formattedCount
              }}</el-text>
            </div>
          </div>
          <div class="time">
            <el-text size="small" type="primary">{{ time }}</el-text>
          </div>
        </div>
      </template>
      <div v-if="cover">
        <img :src="cover" shadow="hover" style="width: 100%; height: 200px" />
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.postcard {
  width: 260px;
  .pointer {
    cursor: pointer;
  }
  .header {
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
