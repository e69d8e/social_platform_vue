import { ref, onMounted } from "vue";

/**
 * 分页列表通用逻辑：管理页码 / 总数 / 加载状态 / 错误重试，负责首屏加载与翻页。
 * fetchPage 需返回 { data: 列表, total: 总数 }
 *
 * @param {Object} options
 * @param {(params: { pageNum: number, pageSize: number }) => Promise<{data: any[], total: number}>} options.fetchPage
 * @param {number} [options.pageSize=8]
 * @param {boolean} [options.immediate=true] 挂载后是否立即请求首页
 * @param {boolean} [options.scrollOnPageChange=true] 翻页后是否回到页面顶部
 *   （分页按钮在列表底部，不回到顶部会看到「点了没反应」）
 */
export function usePageList({
  fetchPage,
  pageSize = 8,
  immediate = true,
  scrollOnPageChange = true,
} = {}) {
  const list = ref([]);
  const pageNum = ref(1);
  // 已真正请求过的页码：用于去重（ListPagination 通过 v-model 会先改写 pageNum，
  // 无法再用「新旧页码是否相同」判断是否需要请求）
  const loadedPage = ref(0);
  const pageSizeRef = ref(pageSize);
  const total = ref(0);
  const loading = ref(true);
  const isError = ref(false);
  // 业务性拒绝（例如对方把关注/粉丝列表设为私密）：不是网络错误，重试也没用，
  // 页面要显示服务端给的原因，而不是伪装成「空列表」
  const isBlocked = ref(false);
  const blockedMessage = ref("");

  const fetchData = async () => {
    loading.value = true;
    isError.value = false;
    isBlocked.value = false;
    blockedMessage.value = "";
    try {
      const res = await fetchPage({
        pageNum: pageNum.value,
        pageSize: pageSizeRef.value,
      });
      if (res?.blocked) {
        isBlocked.value = true;
        blockedMessage.value = res.message || "";
        list.value = [];
        total.value = 0;
        return;
      }
      list.value = res?.data ?? [];
      total.value = res?.total ?? 0;
      loadedPage.value = pageNum.value;
    } catch {
      // 请求级错误提示已由拦截器统一弹出，这里只标记状态供页面渲染重试入口
      isError.value = true;
    } finally {
      loading.value = false;
    }
  };

  const pageChange = async (newPage) => {
    if (newPage === loadedPage.value) return;
    pageNum.value = newPage;
    if (scrollOnPageChange) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    await fetchData();
  };

  /** 重置回第一页并重新请求（例如关键词变化后） */
  const reset = async () => {
    pageNum.value = 1;
    await fetchData();
  };

  /** 失败重试：重新请求当前页 */
  const retry = () => fetchData();

  onMounted(() => {
    if (immediate) fetchData();
  });

  return {
    list,
    pageNum,
    pageSize: pageSizeRef,
    total,
    loading,
    isError,
    isBlocked,
    blockedMessage,
    fetchData,
    pageChange,
    reset,
    retry,
  };
}
