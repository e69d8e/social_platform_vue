<script setup>
import { ref, onMounted, computed } from "vue";
import { getDashboardApi } from "@/api/adminApi";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from "echarts/components";
import { ArrowLeft } from "@element-plus/icons-vue";
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

const fetchData = async () => {
  loading.value = true;
  const res = await getDashboardApi({ days: days.value });
  dailyPosts.value = res.data.data.dailyPosts;
  weeklyNewUsers.value = res.data.data.weeklyNewUsers;
  dailyActiveUsers.value = res.data.data.dailyActiveUsers;
  loading.value = false;
};

onMounted(fetchData);

const handleDaysChange = () => {
  fetchData();
};

const textColor = computed(() =>
  themeStore.darkMode ? "#faf9f5" : "#141413"
);
const subTextColor = computed(() =>
  themeStore.darkMode ? "#a09d96" : "#6c6a64"
);
const lineColor = computed(() =>
  themeStore.darkMode ? "#333230" : "#e6dfd8"
);

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
  title: { text: "每日发帖数量", left: "center", textStyle: { color: textColor.value, fontSize: 15 } },
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
  title: { text: "用户增长（按周）", left: "center", textStyle: { color: textColor.value, fontSize: 15 } },
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
  title: { text: "每日活跃用户", left: "center", textStyle: { color: textColor.value, fontSize: 15 } },
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
    <div class="page-header">
      <div class="back" @click="$router.back()">
        <el-icon size="18"><ArrowLeft /></el-icon>
        <span>返回</span>
      </div>
      <span class="page-title">数据面板</span>
    </div>

    <div class="toolbar">
      <span class="toolbar-label">时间范围</span>
      <el-radio-group v-model="days" @change="handleDaysChange" size="small">
        <el-radio-button :value="7">近 7 天</el-radio-button>
        <el-radio-button :value="30">近 30 天</el-radio-button>
        <el-radio-button :value="90">近 90 天</el-radio-button>
      </el-radio-group>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <v-chart :option="postsOption" autoresize style="height: 340px" />
      </div>
      <div class="chart-card">
        <v-chart :option="usersOption" autoresize style="height: 340px" />
      </div>
      <div class="chart-card">
        <v-chart :option="activeOption" autoresize style="height: 340px" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 12px 40px;

  .page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 4px 16px;

    .back {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 14px;
      padding: 4px 8px;
      border-radius: $radius-sm;
      transition: all $transition-base;
      flex-shrink: 0;

      &:hover {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
    }

    .page-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }
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
}

@media (min-width: 900px) {
  .dashboard-page .charts-grid {
    grid-template-columns: 1fr 1fr;

    .chart-card:first-child {
      grid-column: 1 / -1;
    }
  }
}
</style>
