<script setup>
import { RouterView, useRoute } from "vue-router";
import BackToTop from "@/components/BackToTop.vue";

const route = useRoute();

// /chat 路由共用一个 key：新会话发出第一条消息后 adoptConversation 会
// router.replace("/chat/:id")「接管」当前页，若按完整 path 作 key，
// 同组件换 key 会触发 out-in 过渡重挂载，enter 阶段可能卡在透明初帧导致白屏。
// 组件内部通过 useChat 自行同步 conversationId，无需重挂载。
const viewKey = () => (route.path.startsWith("/chat/") ? "/chat" : route.path);
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="viewKey()" />
    </Transition>
  </RouterView>
  <BackToTop />
</template>
