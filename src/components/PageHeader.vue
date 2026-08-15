<script setup>
import { useAttrs } from "vue";
import BackButton from "./BackButton.vue";

defineOptions({ inheritAttrs: false });

defineProps({
  title: { type: String, default: "" },
  /** 总数，传 null 时不显示“共 x 篇” */
  total: { type: Number, default: null },
  unit: { type: String, default: "篇" },
  /** 大标题模式（个人中心/个人主页等使用 h2） */
  large: { type: Boolean, default: false },
});

// 透传给 BackButton（如 @click 自定义返回行为）
const attrs = useAttrs();
</script>

<template>
  <div class="page-header" :class="{ large }">
    <BackButton v-bind="attrs" />
    <h2 v-if="large" class="page-title">{{ title }}</h2>
    <span v-else class="page-title">{{ title }}</span>
    <span v-if="total !== null" class="total-count">
      共 {{ total }} {{ unit }}
    </span>
    <slot name="extra" />
  </div>
</template>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px 16px;

  &.large {
    padding: 0;
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
    }
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .total-count {
    font-size: 13px;
    color: var(--text-secondary);
  }
}
</style>
