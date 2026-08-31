<script setup>
import { ref, onMounted, computed } from "vue";
import { getDashboardApi } from "@/api/adminApi";
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
} from "@element-plus/icons-vue";
import { useThemeStore } from "@/stores/theme";

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
]);

const themeStore = useThemeStore();
const loading = ref(true);
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
  const res = await getDashboardApi({ days: days.value });
  const data = res.data.data || {};
  summary.value = { ...emptySummary(), ...(data.summary || {}) };
  dailyPosts.value = data.dailyPosts || [];
  weeklyNewUsers.value = data.weeklyNewUsers || [];
  dailyActiveUsers.value = data.dailyActiveUsers || [];
  loading.value = false;
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

const textColor = computed(() => (themeStore.darkMode ? "#faf9f5" : "#141413"));
const subTextColor = computed(() =>
  themeStore.darkMode ? "#a09d96" : "#6c6a64",
);
const lineColor = computed(() => (themeStore.darkMode ? "#333230" : "#e6dfd8"));

const baseOption = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 48, right: 24, top: 48, bottom: 56 },
  dataZoom: [
    { type: "inside", start: 0, end: 100 },
    { type: "slider", height: 20, bottom: 4 },
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
      itemStyle: { color: "#cc785c" },
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
      itemStyle: { color: "#5db872" },
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
      itemStyle: { color: "#e8a55a" },
      lineStyle: { width: 2 },
    },
  ],
  xAxis: {
    ...baseOption.value.xAxis,
    data: dailyActiveUsers.value.map((d) => d.date),
  },
}));
</script>

<template>
  <div class="dashboard-page" v-loading="loading">
    <PageHeader title="数据面板" />

    <div class="toolbar">
      <span class="toolbar-label">时间范围</span>
      <el-radio-group v-model="days" @change="handleDaysChange" size="small">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
        <el-radio-button :value="90">近 90 天</el-radio-button>
      </el-radio-group>
    </div>

    <div class="summary-grid">
      <div v-for="card in summaryCards" :key="card.label" class="summary-card">
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
        <v-chart :option="postsOption" autoresize class="dashboard-chart" />
      </div>
      <div class="chart-card">
        <v-chart :option="usersOption" autoresize class="dashboard-chart" />
      </div>
      <div class="chart-card">
        <v-chart :option="activeOption" autoresize class="dashboard-chart" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 12px 40px;

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
