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
    position: relative;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    padding-left: 12px;

    // 珊瑚段落标：呼应首页小节标题语法
    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      border-radius: 2px;
      background: var(--el-color-primary);
    }
  }

  .total-count {
    display: inline-flex;
    align-items: center;
    padding: 2px 12px 3px;
    font-size: 12px;
    color: var(--text-muted);
    background: var(--bg-subtle);
    border: 1px solid var(--border-light);
    border-radius: $radius-full;
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 640px) {
  .page-header {
    gap: 8px;
    padding: 4px 2px 12px;

    &.large {
      margin-bottom: 14px;

      .page-title {
        font-size: 18px;
      }
    }

    .page-title {
      font-size: 16px;
    }

    .total-count {
      padding: 1px 8px;
      font-size: 11.5px;
    }
  }
}
</style>
