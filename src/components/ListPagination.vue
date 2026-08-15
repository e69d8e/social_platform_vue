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
}
</style>
