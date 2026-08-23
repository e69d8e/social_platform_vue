<script setup>
import { computed } from "vue";

const props = defineProps({
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 8 },
  pageNum: { type: Number, default: 1 },
  layout: { type: String, default: "prev, pager, next" },
  /** 显示条件：pageSize（超过一页才显示）| zero（总数大于 0 就显示） */
  showWhen: { type: String, default: "pageSize" },
});

const emit = defineEmits(["update:pageNum", "change"]);

const visible = computed(() =>
  props.showWhen === "zero" ? props.total > 0 : props.total > props.pageSize,
);

const handleChange = (page) => {
  emit("update:pageNum", page);
  emit("change", page);
};
</script>

<template>
  <div v-if="visible" class="pagination">
    <el-pagination
      :total="total"
      :page-size="pageSize"
      :current-page="pageNum"
      background
      :layout="layout"
      @current-change="handleChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;

  // 品牌化分页：当前页渐变胶囊 + 悬停轻反馈
  :deep(.el-pagination) {
    .el-pager li {
      border-radius: $radius-sm;
      font-weight: 500;
      transition: all var(--transition-base);

      &:hover {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      &.is-active {
        background: var(--gradient-primary);
        color: #fff;
        box-shadow: var(--shadow-sm);

        &:hover {
          color: #fff;
          background: var(--gradient-primary);
        }
      }
    }

    .btn-prev,
    .btn-next {
      border-radius: $radius-sm;
      transition: all var(--transition-base);

      &:hover:not(:disabled) {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
    }
  }
}
</style>
