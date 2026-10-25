import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "@/stores/user";

/**
 * 统一登录守卫：未登录时给出提示并跳转登录页。
 *
 * 用法：
 *   const requireLogin = useRequireLogin();
 *   if (!requireLogin("请先登录后再点赞")) return;
 *
 * @returns {(hint?: string) => boolean} 已登录返回 true；未登录提示并跳转后返回 false
 */
export function useRequireLogin() {
  const router = useRouter();
  const userStore = useUserStore();

  return (hint = "请先登录") => {
    if (userStore.isLoggedIn) return true;
    ElMessage.info(hint);
    router.push("/login");
    return false;
  };
}
