<script setup>
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import { connect } from "@/utils/websocket.js";
onMounted(() => {
  connect((msg) => {
    console.log("收到消息:", msg);
    const data = JSON.parse(msg);
    // eslint-disable-next-line no-undef
    ElNotification.success({
      title: data.content,
      message: "帖子标题: " + data.title,
      dangerouslyUseHTMLString: true,
      offset: 100,
    });
  });
});
</script>

<template>
  <RouterView />
</template>
