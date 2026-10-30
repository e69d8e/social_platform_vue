<script setup>
import { useAttrs } from "vue";
import { ArrowLeft } from "@element-plus/icons-vue";
import { useGoBack } from "@/composables/useGoBack";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  /** 图标尺寸 */
  size: { type: [Number, String], default: 18 },
  /** 按钮文字，传空字符串只显示图标 */
  text: { type: String, default: "返回" },
  /** 站内没有可回退历史时的落地页 */
  fallback: { type: String, default: "/home" },
});

const emit = defineEmits(["click"]);
const attrs = useAttrs();

const goBack = useGoBack(props.fallback);

// 父组件绑定 @click 时由父组件接管返回行为，否则走统一回退（无站内历史时回兜底页）
const handleClick = () => {
  if (typeof attrs.onClick === "function") {
    emit("click");
  } else {
    goBack();
  }
};
</script>

<template>
  <button
    type="button"
    class="back-btn"
    :class="attrs.class"
    :style="attrs.style"
    aria-label="返回上一页"
    @click="handleClick"
  >
    <el-icon :size="size"><ArrowLeft /></el-icon>
    <span v-if="text">{{ text }}</span>
  </button>
</template>

<style lang="scss" scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 6px 10px;
  border: none;
  background: none;
  font-family: inherit;
  border-radius: $radius-sm;
  transition: all $transition-base;
  flex-shrink: 0;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
  }
}
</style>
