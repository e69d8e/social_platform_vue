<script setup>
import { useAttrs } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";

defineOptions({ inheritAttrs: false });

defineProps({
  /** 图标尺寸 */
  size: { type: [Number, String], default: 18 },
  /** 按钮文字，传空字符串只显示图标 */
  text: { type: String, default: "返回" },
});

const emit = defineEmits(["click"]);
const attrs = useAttrs();
const router = useRouter();

// 父组件绑定 @click 时由父组件接管返回行为，否则默认 router.back()
const handleClick = () => {
  if (typeof attrs.onClick === "function") {
    emit("click");
  } else {
    router.back();
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
