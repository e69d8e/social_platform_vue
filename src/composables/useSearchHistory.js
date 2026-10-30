import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user";
import {
  getSearchHistoryApi,
  deleteSearchHistoryApi,
  clearSearchHistoryApi,
} from "@/api/searchApi";

/**
 * 搜索历史三件套：拉取 / 删除单条 / 清空（带确认弹窗）。
 * 未登录时各操作均为空操作，由调用方决定是否展示入口。
 *
 * @param {Object} [options]
 * @param {number} [options.pageSize=10] 拉取条数
 */
export function useSearchHistory({ pageSize = 10 } = {}) {
  const userStore = useUserStore();

  const historyList = ref([]);
  const historyLoading = ref(false);

  const fetchHistory = async () => {
    if (!userStore.isLoggedIn) return;
    historyLoading.value = true;
    try {
      const res = await getSearchHistoryApi({ pageNum: 1, pageSize });
      historyList.value = res.data.data || [];
    } catch {
      // 历史拉取失败不打扰用户，错误提示已由请求拦截器统一处理
    } finally {
      historyLoading.value = false;
    }
  };

  const deleteHistory = async (id) => {
    try {
      await deleteSearchHistoryApi(id);
      historyList.value = historyList.value.filter((h) => h.id !== id);
    } catch {
      // 删除失败保持列表原样，错误提示由拦截器统一弹出
    }
  };

  const clearHistory = async () => {
    try {
      await ElMessageBox.confirm(
        "清空后无法恢复，确定清空全部搜索历史吗？",
        "清空搜索历史",
        {
          confirmButtonText: "清空",
          cancelButtonText: "取消",
          type: "warning",
        },
      );
    } catch {
      return; // 用户取消
    }
    try {
      await clearSearchHistoryApi();
      historyList.value = [];
      ElMessage.success("已清空搜索历史");
    } catch {
      // 错误提示已由请求拦截器统一处理
    }
  };

  return {
    historyList,
    historyLoading,
    fetchHistory,
    deleteHistory,
    clearHistory,
  };
}
