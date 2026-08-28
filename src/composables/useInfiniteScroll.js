import { ref, onMounted, onUnmounted } from "vue";
import { debounce } from "lodash-es";

/**
 * 无限滚动列表通用逻辑：维护游标与去重，监听 window 滚动自动加载更多。
 * fetchPage 需返回 { list: 新增列表, minTime: 下一页游标, offset: 下一页偏移 }
 *
 * @param {Object} options
 * @param {(cursor: { lastId: number, offset: number }) => Promise<{list: any[], minTime: number, offset: number}>} options.fetchPage
 * @param {number} [options.threshold=100] 距底部多少像素触发加载
 * @param {number} [options.debounceWait=200] 滚动防抖时长
 * @param {boolean} [options.autoFill=false] 首屏内容不足时自动补足
 * @param {(e: Error) => void} [options.onError] 加载失败回调
 */
export function useInfiniteScroll({
  fetchPage,
  threshold = 100,
  debounceWait = 200,
  autoFill = false,
  onError,
} = {}) {
  const items = ref([]);
  const loading = ref(true);
  const loadingMore = ref(false);
  const noMore = ref(false);
  const isError = ref(false);
  const cursor = ref({ lastId: Date.parse(new Date()), offset: 0 });
  const seenIds = new Set();

  const append = async () => {
    if (loadingMore.value || noMore.value) return;
    loadingMore.value = true;
    isError.value = false;
    try {
      const res = (await fetchPage({ ...cursor.value })) ?? {};
      const list = res.list ?? [];
      const newItems = list.filter((item) => !seenIds.has(item.id));
      newItems.forEach((item) => seenIds.add(item.id));
      items.value = [...items.value, ...newItems];
      cursor.value.lastId = res.minTime ?? cursor.value.lastId;
      cursor.value.offset = res.offset ?? cursor.value.offset;
      if (list.length === 0 || newItems.length === 0) noMore.value = true;
    } catch (e) {
      isError.value = true;
      onError?.(e);
    } finally {
      loadingMore.value = false;
    }
  };

  const retry = async () => {
    isError.value = false;
    await append();
  };

  const checkAndLoad = () => {
    if (loadingMore.value || noMore.value || isError.value) return;
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight = document.documentElement.clientHeight;
    const scrollHeight =
      document.documentElement.scrollHeight || document.body.scrollHeight;
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      append();
    }
  };

  const handleScroll = debounce(checkAndLoad, debounceWait);

  onMounted(async () => {
    try {
      await append();
    } finally {
      loading.value = false;
    }
    if (autoFill) {
      // 内容不满一屏时自动加载更多，最多重试 10 次防止死循环
      let fillAttempts = 0;
      while (
        !noMore.value &&
        !isError.value &&
        fillAttempts < 10 &&
        document.documentElement.scrollHeight <= window.innerHeight + 100
      ) {
        fillAttempts++;
        await append();
      }
    }
    window.addEventListener("scroll", handleScroll);
  });

  onUnmounted(() => {
    handleScroll.cancel();
    window.removeEventListener("scroll", handleScroll);
  });

  return { items, loading, loadingMore, noMore, isError, loadMore: append, retry };
}
