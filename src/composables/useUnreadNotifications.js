import { ref, onMounted, onUnmounted } from "vue";
import { useUserStore } from "@/stores/user";
import { getUnreadNotificationCountApi } from "@/api/notificationApi";

/**
 * 未读通知数：30s 轮询 + 页面切回前台刷新。
 * 与 useUnreadMessages 模式一致，但走 /notification 接口。
 */
export function useUnreadNotifications() {
  const userStore = useUserStore();
  const unreadCount = ref(0);

  const fetchUnreadCount = async () => {
    if (!userStore.isLoggedIn) return;
    try {
      const res = await getUnreadNotificationCountApi();
      if (res.data.code === 1) {
        unreadCount.value = Number(res.data.data || 0);
      }
    } catch {
      // silently fail
    }
  };

  let timer = null;

  const startPolling = () => {
    stopPolling();
    timer = setInterval(fetchUnreadCount, 30000);
  };

  const stopPolling = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopPolling();
    } else if (userStore.isLoggedIn) {
      fetchUnreadCount();
      startPolling();
    }
  };

  const handleUnreadChanged = () => {
    fetchUnreadCount();
  };

  onMounted(() => {
    if (userStore.isLoggedIn) {
      fetchUnreadCount();
      startPolling();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notification-unread-changed", handleUnreadChanged);
  });

  onUnmounted(() => {
    stopPolling();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener(
      "notification-unread-changed",
      handleUnreadChanged,
    );
  });

  return { unreadCount, fetchUnreadCount };
}
