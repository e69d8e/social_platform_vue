<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  getDashboardApi,
  getAdminCategoriesApi,
  createAdminCategoryApi,
  updateAdminCategoryApi,
  toggleAdminCategoryApi,
} from "@/api/adminApi";
import VChart from "vue-echarts";
import PageHeader from "@/components/PageHeader.vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  AriaComponent,
} from "echarts/components";
import {
  User,
  UserFilled,
  Document,
  ChatDotRound,
  Star,
  View,
  Edit,
  TrendCharts,
  Plus,
  Refresh,
} from "@element-plus/icons-vue";
import { useThemeStore } from "@/stores/theme";

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  AriaComponent,
]);

const themeStore = useThemeStore();
const loading = ref(true);
const loadError = ref(false);
const days = ref(30);

const dailyPosts = ref([]);
const weeklyNewUsers = ref([]);
const dailyActiveUsers = ref([]);

const emptySummary = () => ({
  totalUsers: 0,
  totalPosts: 0,
  totalComments: 0,
  totalLikes: 0,
  totalViews: 0,
  todayNewUsers: 0,
  todayPosts: 0,
  todayActiveUsers: 0,
});
const summary = ref(emptySummary());

const fetchData = async () => {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await getDashboardApi({ days: days.value });
    const data = res.data.data || {};
    summary.value = { ...emptySummary(), ...(data.summary || {}) };
    dailyPosts.value = data.dailyPosts || [];
    weeklyNewUsers.value = data.weeklyNewUsers || [];
    dailyActiveUsers.value = data.dailyActiveUsers || [];
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
};

const summaryCards = computed(() => [
  { label: "用户总数", value: summary.value.totalUsers, icon: User },
  { label: "帖子总数", value: summary.value.totalPosts, icon: Document },
  { label: "评论总数", value: summary.value.totalComments, icon: ChatDotRound },
  { label: "点赞总数", value: summary.value.totalLikes, icon: Star },
  { label: "浏览总数", value: summary.value.totalViews, icon: View },
  {
    label: "今日新增用户",
    value: summary.value.todayNewUsers,
    icon: UserFilled,
  },
  { label: "今日新增帖子", value: summary.value.todayPosts, icon: Edit },
  {
    label: "今日活跃用户",
    value: summary.value.todayActiveUsers,
    icon: TrendCharts,
  },
]);

const formatCount = (value) => Number(value ?? 0).toLocaleString("zh-CN");

onMounted(fetchData);

const handleDaysChange = () => {
  fetchData();
};

// theme store 暴露的是 isDark（darkMode 字段不存在）
const isDark = computed(() => themeStore.isDark);
const textColor = computed(() => (isDark.value ? "#faf8f5" : "#181816"));
const subTextColor = computed(() => (isDark.value ? "#a6a39b" : "#78756d"));
const lineColor = computed(() => (isDark.value ? "#2e2c27" : "#e8e3dc"));
// 折线配色与设计 token 同源（primary/success/warning 的明暗两套）
const seriesColors = computed(() =>
  isDark.value
    ? ["#d4785f", "#6eb395", "#f0b858"]
    : ["#b5573d", "#5a947a", "#d99426"],
);

const baseOption = computed(() => ({
  aria: { enabled: true, decal: { show: false } },
  tooltip: { trigger: "axis" },
  grid: { left: 48, right: 24, top: 48, bottom: 56 },
  dataZoom: [
    { type: "inside", start: 0, end: 100 },
    {
      type: "slider",
      height: 20,
      bottom: 4,
      backgroundColor: "transparent",
      borderColor: "transparent",
      fillerColor: isDark.value
        ? "rgba(212, 120, 95, 0.25)"
        : "rgba(181, 87, 61, 0.18)",
      handleStyle: {
        color: isDark.value ? "#d4785f" : "#b5573d",
        borderColor: isDark.value ? "#d4785f" : "#b5573d",
      },
      moveHandleStyle: {
        color: isDark.value ? "#d4785f" : "#b5573d",
      },
      textStyle: { color: subTextColor.value },
      dataBackground: {
        lineStyle: { color: lineColor.value },
        areaStyle: { color: lineColor.value, opacity: 0.2 },
      },
    },
  ],
  xAxis: {
    type: "category",
    axisLabel: { color: subTextColor.value },
    axisLine: { lineStyle: { color: lineColor.value } },
  },
  yAxis: {
    type: "value",
    minInterval: 1,
    axisLabel: { color: subTextColor.value },
    splitLine: { lineStyle: { color: lineColor.value } },
  },
}));

const postsOption = computed(() => ({
  ...baseOption.value,
  title: {
    text: "每日发帖数量",
    left: "center",
    textStyle: { color: textColor.value, fontSize: 15 },
  },
  series: [
    {
      type: "line",
      data: dailyPosts.value.map((d) => d.count),
      smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: seriesColors.value[0] },
      lineStyle: { width: 2 },
    },
  ],
  xAxis: {
    ...baseOption.value.xAxis,
    data: dailyPosts.value.map((d) => d.date),
  },
}));

const usersOption = computed(() => ({
  ...baseOption.value,
  title: {
    text: "用户增长（按周）",
    left: "center",
    textStyle: { color: textColor.value, fontSize: 15 },
  },
  series: [
    {
      type: "line",
      data: weeklyNewUsers.value.map((d) => d.count),
      smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: seriesColors.value[1] },
      lineStyle: { width: 2 },
    },
  ],
  xAxis: {
    ...baseOption.value.xAxis,
    data: weeklyNewUsers.value.map((d) => d.date),
  },
}));

const activeOption = computed(() => ({
  ...baseOption.value,
  title: {
    text: "每日活跃用户",
    left: "center",
    textStyle: { color: textColor.value, fontSize: 15 },
  },
  series: [
    {
      type: "line",
      data: dailyActiveUsers.value.map((d) => d.count),
      smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: seriesColors.value[2] },
      lineStyle: { width: 2 },
    },
  ],
  xAxis: {
    ...baseOption.value.xAxis,
    data: dailyActiveUsers.value.map((d) => d.date),
  },
}));

// ---- 分类管理 ----
const activeTab = ref("overview");
const categoriesLoading = ref(false);
const categoryList = ref([]);
const categoryLoaded = ref(false);

const categoryDialogVisible = ref(false);
const categorySaving = ref(false);
const categoryForm = reactive({
  id: null,
  name: "",
  icon: "",
  color: "#cc6d4e",
  description: "",
  sortOrder: 50,
  enabled: true,
});

const loadCategories = async () => {
  categoriesLoading.value = true;
  try {
    const res = await getAdminCategoriesApi();
    if (res.data?.code === 1) {
      categoryList.value = res.data.data || [];
      categoryLoaded.value = true;
    }
  } catch {
    // 拦截器处理提示
  } finally {
    categoriesLoading.value = false;
  }
};

const switchAdminTab = (tab) => {
  activeTab.value = tab;
  if (tab === "categories" && !categoryLoaded.value) {
    loadCategories();
  }
};

const openCreateCategory = () => {
  categoryForm.id = null;
  categoryForm.name = "";
  categoryForm.icon = "";
  categoryForm.color = "#cc6d4e";
  categoryForm.description = "";
  categoryForm.sortOrder = (categoryList.value.length + 1) * 10;
  categoryForm.enabled = true;
  categoryDialogVisible.value = true;
};

const openEditCategory = (row) => {
  categoryForm.id = row.id;
  categoryForm.name = row.name || "";
  categoryForm.icon = row.icon || "";
  categoryForm.color = row.color || "#cc6d4e";
  categoryForm.description = row.description || "";
  categoryForm.sortOrder = Number(row.sortOrder ?? 0);
  categoryForm.enabled = row.enabled !== false;
  categoryDialogVisible.value = true;
};

const saveCategory = async () => {
  const trimmedName = categoryForm.name.trim();
  if (!trimmedName) {
    ElMessage.warning("请输入分类名称");
    return;
  }
  categorySaving.value = true;
  try {
    const payload = {
      id: categoryForm.id || undefined,
      name: trimmedName,
      icon: categoryForm.icon.trim(),
      color: categoryForm.color || "#cc6d4e",
      description: categoryForm.description.trim(),
      sortOrder: Number(categoryForm.sortOrder ?? 0),
      enabled: categoryForm.enabled,
    };
    const res = categoryForm.id
      ? await updateAdminCategoryApi(payload)
      : await createAdminCategoryApi(payload);
    if (res.data?.code === 1) {
      ElMessage.success(categoryForm.id ? "分类已更新" : "分类已创建");
      categoryDialogVisible.value = false;
      await loadCategories();
    }
  } catch {
    // 拦截器处理提示
  } finally {
    categorySaving.value = false;
  }
};

const handleToggleCategory = async (row) => {
  try {
    const res = await toggleAdminCategoryApi(row.id);
    if (res.data?.code === 1) {
      row.enabled = !row.enabled;
      ElMessage.success(row.enabled ? "已启用分类" : "已禁用分类");
    }
  } catch {
    // 拦截器处理提示
  }
};
</script>

<template>
  <div class="dashboard-page">
    <PageHeader title="数据与运营后台" />

    <div class="admin-tabs">
      <button
        type="button"
        class="admin-tab"
        :class="{ active: activeTab === 'overview' }"
        @click="switchAdminTab('overview')"
      >
        数据概览
      </button>
      <button
        type="button"
        class="admin-tab"
        :class="{ active: activeTab === 'categories' }"
        @click="switchAdminTab('categories')"
      >
        分类管理
      </button>
    </div>

    <div v-show="activeTab === 'overview'" v-loading="loading">
      <div class="toolbar">
        <span class="toolbar-label">时间范围</span>
        <el-radio-group v-model="days" @change="handleDaysChange" size="small">
          <el-radio-button :value="7">近 7 天</el-radio-button>
          <el-radio-button :value="30">近 30 天</el-radio-button>
          <el-radio-button :value="90">近 90 天</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="loadError" class="dashboard-error">
        <el-empty description="数据加载失败">
          <el-button type="primary" round @click="fetchData"
            >重新加载</el-button
          >
        </el-empty>
      </div>

      <template v-else>
        <div class="summary-grid">
          <div
            v-for="card in summaryCards"
            :key="card.label"
            class="summary-card"
          >
            <div class="summary-icon">
              <el-icon :size="20"><component :is="card.icon" /></el-icon>
            </div>
            <div class="summary-info">
              <span class="summary-value">{{ formatCount(card.value) }}</span>
              <span class="summary-label">{{ card.label }}</span>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <v-chart
              :option="postsOption"
              autoresize
              class="dashboard-chart"
              aria-label="近30天每日发帖趋势"
            />
          </div>
          <div class="chart-card">
            <v-chart
              :option="usersOption"
              autoresize
              class="dashboard-chart"
              aria-label="用户增长（按周）"
            />
          </div>
          <div class="chart-card">
            <v-chart
              :option="activeOption"
              autoresize
              class="dashboard-chart"
              aria-label="每日活跃用户"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- 分类管理面板 -->
    <div v-show="activeTab === 'categories'" v-loading="categoriesLoading">
      <div class="category-toolbar">
        <el-button type="primary" :icon="Plus" @click="openCreateCategory">
          新增分类
        </el-button>
        <el-button :icon="Refresh" @click="loadCategories">刷新</el-button>
      </div>

      <div class="category-table-card">
        <p class="table-scroll-hint">左右滑动查看完整表格</p>
        <el-table :data="categoryList" stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column label="分类标识" min-width="150">
            <template #default="{ row }">
              <div class="cat-badge-cell">
                <span
                  class="cat-color-dot"
                  :style="{ background: row.color || '#cc6d4e' }"
                >
                  {{ row.icon || (row.name ? row.name.charAt(0) : "分") }}
                </span>
                <span class="cat-name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="description"
            label="简介说明"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column prop="sortOrder" label="排序" width="90" />
          <el-table-column prop="postCount" label="公开贴数" width="100" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-switch
                :model-value="row.enabled !== false"
                @change="handleToggleCategory(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                @click="openEditCategory(row)"
              >
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      width="min(92vw, 460px)"
    >
      <el-form label-width="84px">
        <el-form-item label="分类名称" required>
          <el-input
            v-model="categoryForm.name"
            maxlength="20"
            show-word-limit
            placeholder="例如：人工智能、数码评测"
          />
        </el-form-item>
        <el-form-item label="图标徽章">
          <el-input
            v-model="categoryForm.icon"
            maxlength="8"
            placeholder="输入 Emoji 或单字（例如 🤖 / 技）"
          />
        </el-form-item>
        <el-form-item label="主题配色">
          <div class="color-picker-row">
            <el-color-picker v-model="categoryForm.color" />
            <span class="color-hex">{{ categoryForm.color }}</span>
          </div>
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number
            v-model="categoryForm.sortOrder"
            :min="0"
            :max="999"
          />
        </el-form-item>
        <el-form-item label="分类简介">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            maxlength="100"
            show-word-limit
            placeholder="一句话描述该专栏涵盖的话题范围"
          />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="categoryForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="categorySaving"
          @click="saveCategory"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .table-scroll-hint {
    display: none;
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .table-scroll-hint {
      display: block;
    }
  }

  .admin-tabs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    margin: 0 4px 18px;
    border-radius: var(--radius-full);
    background: var(--bg-subtle);
    border: 1px solid var(--border-light);

    .admin-tab {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      padding: 6px 16px;
      border-radius: var(--radius-full);
      font-size: 13.5px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: all var(--transition-fast);

      &.active {
        background: var(--bg-card);
        color: var(--el-color-primary);
        font-weight: 600;
        box-shadow: var(--shadow-sm);
      }
    }
  }

  .category-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px 16px;
  }

  .category-table-card {
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: $radius-lg;
    padding: 12px;
    box-shadow: var(--shadow-md);
  }

  .cat-badge-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .cat-color-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .cat-name-text {
      font-weight: 600;
      color: var(--text-ink);
    }
  }

  .color-picker-row {
    display: flex;
    align-items: center;
    gap: 10px;

    .color-hex {
      font-size: 13px;
      color: var(--text-secondary);
      font-family: monospace;
    }
  }

  .dashboard-error {
    padding: 40px 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 4px 20px;

    .toolbar-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 0 4px 20px;

    .summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: $radius-lg;
      padding: 16px;
      box-shadow: var(--shadow-md);

      .summary-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: $radius-md;
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      .summary-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;

        .summary-value {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--text-primary);
        }

        .summary-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
      }
    }
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;

    .chart-card {
      background: var(--bg-card);
      border-radius: $radius-lg;
      padding: 20px 16px 12px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-light);
    }
  }

  .dashboard-chart {
    height: 340px;
  }
}

@media (min-width: 900px) {
  .dashboard-page .summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .dashboard-page .charts-grid {
    grid-template-columns: 1fr 1fr;

    .chart-card:first-child {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 640px) {
  .dashboard-page {
    padding: 10px 8px 36px;

    .toolbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      padding-bottom: 14px;
    }

    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-bottom: 14px;

      .summary-card {
        padding: 12px 10px;
        gap: 8px;

        .summary-icon {
          width: 36px;
          height: 36px;
        }

        .summary-info .summary-value {
          font-size: 18px;
        }

        .summary-info .summary-label {
          font-size: 11.5px;
        }
      }
    }

    .charts-grid {
      gap: 12px;

      .chart-card {
        padding: 14px 8px 8px;
        border-radius: var(--radius-md);
      }
    }

    .dashboard-chart {
      height: 280px;
    }
  }
}
</style>
