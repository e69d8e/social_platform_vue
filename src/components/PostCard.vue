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
});
</script>

<template>
  <div class="postcard">
    <el-card style="max-width: 280px">
      <template #header>{{ props.title }}</template>
      <img :src="props.imgUrl" style="width: 100%" />
    </el-card>
  </div>
</template>
