<script setup>
const props = defineProps({
  title: {
    type: String,
    default: "title",
  },
  imgUrl: {
    type: String,
    default: "http://localhost:8080/imgs/icons/default.png",
  },
  content: {
    type: String,
    default: "content",
  },
});
</script>

<template>
  <div class="postcard">
    <el-card style="">
      <template #header>{{ props.title }}</template>
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
    transform: scale(1.05 );
  }
}

.postcard:hover {
  animation: grow 0.5s ease-in-out;
  animation-fill-mode: forwards; /* 保持最后状态 */
}
</style>
