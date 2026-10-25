import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/user";
import { getUnreadCountApi } from "@/api/messageApi";

/**
 * 未读私信数：登录态下 30s 轮询 + 页面切回前台立即刷新 + 路由切换时刷新。
 * 页面隐藏时暂停轮询，避免后台空转。
 */
export function useUnreadMessages() {
  const route = useRoute();
  const userStore = useUserStore();
  const unreadCount = ref(0);

  const fetchUnreadCount = async () => {
    if (!userStore.isLoggedIn) return;
    try {
      const res = await getUnreadCountApi();
      if (res.data.code === 1) {
        unreadCount.value = res.data.data || 0;
      }
    } catch {
      // silently fail
    }
  };

  let unreadTimer = null;

  const startUnreadPolling = () => {
    stopUnreadPolling();
    unreadTimer = setInterval(fetchUnreadCount, 30000);
  };

  const stopUnreadPolling = () => {
    if (unreadTimer) {
      clearInterval(unreadTimer);
      unreadTimer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopUnreadPolling();
    } else if (userStore.isLoggedIn) {
      fetchUnreadCount();
      startUnreadPolling();
    }
  };

  onMounted(() => {
    if (userStore.isLoggedIn) {
      fetchUnreadCount();
      startUnreadPolling();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
  });

  onUnmounted(() => {
    stopUnreadPolling();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  // 路由切换（如从私信页返回）时立即校准一次未读数
  watch(
    () => route.path,
    () => {
      if (userStore.isLoggedIn) {
        fetchUnreadCount();
      }
    },
  );

  return { unreadCount, fetchUnreadCount };
}
