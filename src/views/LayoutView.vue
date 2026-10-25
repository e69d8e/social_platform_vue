<script setup>
import AppHeader from "@/components/layout/AppHeader.vue";
import MobileBottomNav from "@/components/layout/MobileBottomNav.vue";
import { useUnreadMessages } from "@/composables/useUnreadMessages";

// 未读私信数统一在此轮询，顶栏与底部导航共享同一份数据
const { unreadCount } = useUnreadMessages();
</script>

<template>
  <div class="layout">
    <el-container>
      <AppHeader :unread-count="unreadCount" />

      <el-main class="main">
        <el-row>
          <el-col :xs="0" :sm="1" :md="1" :lg="2" :xl="3" />
          <el-col :xs="24" :sm="22" :md="22" :lg="20" :xl="18">
            <router-view v-slot="{ Component, route }">
              <Transition name="page" mode="out-in">
                <component :is="Component" :key="route.path" />
              </Transition>
            </router-view>
          </el-col>
          <el-col :xs="0" :sm="1" :md="1" :lg="2" :xl="3" />
        </el-row>
      </el-main>

      <!-- 移动端底部导航栏 (<768px 显示) -->
      <MobileBottomNav :unread-count="unreadCount" />
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.layout {
  min-height: 100vh;
  background: var(--bg-page);

  .main {
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
