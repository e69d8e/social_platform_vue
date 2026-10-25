import { ref, watch } from "vue";
import { throttle } from "lodash-es";
import { likeApi } from "@/api/postApi";
import { ElMessage } from "element-plus";
import { useRequireLogin } from "@/composables/useRequireLogin";

/**
 * 点赞交互通用逻辑：乐观更新 + 失败回滚 + leading 节流防双击 + 心跳动画节拍。
 *
 * @param {Object} options
 * @param {() => any} options.postId 帖子 id 取值函数
 * @param {() => boolean} options.liked 外部点赞状态取值函数（父组件数据刷新后自动同步）
 * @param {() => number} options.likeCount 外部点赞数取值函数
 */
export function useLike({ postId, liked, likeCount } = {}) {
  const requireLogin = useRequireLogin();

  const isLiked = ref(Boolean(liked()));
  const count = ref(Number(likeCount()) || 0);
  // 每次成功切到「已点赞」时 +1，触发图标重挂载从而重放心跳动画
  const popTick = ref(0);

  watch(liked, (val) => {
    isLiked.value = Boolean(val);
  });
  watch(likeCount, (val) => {
    count.value = Number(val) || 0;
  });

  // in-flight 守卫 + leading throttle：杜绝快速双击造成「赞→取消」双翻转
  let inFlight = false;
  const handleToggle = async () => {
    if (inFlight) return;
    if (!requireLogin("请先登录后再点赞")) return;
    const oldLiked = isLiked.value;
    const oldCount = count.value;
    isLiked.value = !isLiked.value;
    count.value += isLiked.value ? 1 : -1;
    if (isLiked.value) popTick.value += 1;
    inFlight = true;
    try {
      const res = await likeApi(postId());
      if (res.data.code !== 1) throw new Error("操作失败");
      // 数字与心跳动画已是即时反馈，信息流里不再弹 toast 轰炸
    } catch {
      isLiked.value = oldLiked;
      count.value = oldCount;
      ElMessage.error("点赞失败，请重试");
    } finally {
      inFlight = false;
    }
  };

  const toggleLike = throttle(handleToggle, 800, { trailing: false });

  return { liked: isLiked, likeCount: count, popTick, toggleLike };
}
