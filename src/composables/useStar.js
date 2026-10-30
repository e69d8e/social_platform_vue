import { ref, watch } from "vue";
import { starApi } from "@/api/starApi";
import { ElMessage } from "element-plus";
import { useRequireLogin } from "@/composables/useRequireLogin";

/**
 * 收藏交互通用逻辑：乐观更新 + 失败回滚 + 防双击 + 心跳动画节拍（与 useLike 同构）。
 *
 * @param {Object} options
 * @param {() => any} options.postId 帖子 id 取值函数
 * @param {() => boolean} options.starred 外部收藏状态取值函数
 * @param {() => number} options.starCount 外部收藏数取值函数
 */
export function useStar({ postId, starred, starCount } = {}) {
  const requireLogin = useRequireLogin();

  const isStarred = ref(Boolean(starred()));
  const count = ref(Number(starCount()) || 0);
  const popTick = ref(0);

  watch(starred, (val) => {
    isStarred.value = Boolean(val);
  });
  watch(starCount, (val) => {
    count.value = Number(val) || 0;
  });

  let inFlight = false;
  const handleToggle = async () => {
    if (inFlight) return;
    if (!requireLogin("请先登录后再收藏")) return;
    const oldStarred = isStarred.value;
    const oldCount = count.value;
    isStarred.value = !isStarred.value;
    count.value += isStarred.value ? 1 : -1;
    if (isStarred.value) popTick.value += 1;
    inFlight = true;
    try {
      const res = await starApi(postId());
      if (res.data.code !== 1) throw new Error("操作失败");
    } catch {
      isStarred.value = oldStarred;
      count.value = oldCount;
      ElMessage.error("收藏操作失败，请重试");
    } finally {
      inFlight = false;
    }
  };

  return {
    starred: isStarred,
    starCount: count,
    popTick,
    toggleStar: handleToggle,
  };
}
