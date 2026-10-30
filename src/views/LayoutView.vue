<script setup>
import AppHeader from "@/components/layout/AppHeader.vue";
import MobileBottomNav from "@/components/layout/MobileBottomNav.vue";
import { useUnreadMessages } from "@/composables/useUnreadMessages";

// 未读私信数统一在此轮询，顶栏与底部导航共享同一份数据
const { unreadCount } = useUnreadMessages();
</script>

<template>
  <div class="layout">
    <AppHeader :unread-count="unreadCount" />

    <main class="main">
      <router-view v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>

    <!-- 移动端底部导航栏 (<768px 显示) -->
    <MobileBottomNav :unread-count="unreadCount" />
  </div>
</template>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  background: var(--bg-page);

  .main {
    display: block;
    padding: 0;
    min-height: calc(100vh - 64px);
    background: var(--bg-page);
  }
}

@media (max-width: 768px) {
  // 给底部导航栏让出空间，避免内容被遮
  .layout .main {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
