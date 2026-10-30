import { useRouter } from "vue-router";

/**
 * 统一「返回上一页」行为。
 *
 * 直接 router.back() 在两种真实场景下会「点了没反应」：
 *   1. 用户从外部链接/新标签页直接打开详情页，站内没有可回退的历史；
 *   2. 详情页本身就是落地页（history 里只有当前记录）。
 * vue-router 会把前一条站内记录写进 history.state.back，
 * 没有它时退回兜底页面，保证按钮永远有反馈。
 *
 * @param {string} fallback 没有站内历史时的落地页
 * @returns {() => void}
 */
export function useGoBack(fallback = "/home") {
  const router = useRouter();

  return () => {
    if (window.history.state?.back) {
      router.back();
      return;
    }
    router.replace(fallback);
  };
}

export default useGoBack;
