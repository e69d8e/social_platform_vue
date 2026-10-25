import { ref, onMounted } from "vue";

/**
 * 分页列表通用逻辑：管理页码 / 总数 / 加载状态 / 错误重试，负责首屏加载与翻页。
 * fetchPage 需返回 { data: 列表, total: 总数 }
 *
 * @param {Object} options
 * @param {(params: { pageNum: number, pageSize: number }) => Promise<{data: any[], total: number}>} options.fetchPage
 * @param {number} [options.pageSize=8]
 * @param {boolean} [options.immediate=true] 挂载后是否立即请求首页
 */
export function usePageList({
  fetchPage,
  pageSize = 8,
  immediate = true,
} = {}) {
  const list = ref([]);
  const pageNum = ref(1);
  const pageSizeRef = ref(pageSize);
  const total = ref(0);
  const loading = ref(true);
  const isError = ref(false);

  const fetchData = async () => {
    loading.value = true;
    isError.value = false;
    try {
      const res = await fetchPage({
        pageNum: pageNum.value,
        pageSize: pageSizeRef.value,
      });
      list.value = res?.data ?? [];
      total.value = res?.total ?? 0;
    } catch {
      // 请求级错误提示已由拦截器统一弹出，这里只标记状态供页面渲染重试入口
      isError.value = true;
    } finally {
      loading.value = false;
    }
  };

  const pageChange = async (newPage) => {
    pageNum.value = newPage;
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
    fetchData,
    pageChange,
    reset,
    retry,
  };
}
