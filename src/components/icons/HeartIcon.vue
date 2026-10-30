<script setup>
/**
 * 点赞图标（心形）。
 *
 * Element Plus 图标库里没有心形，而点赞与收藏如果都用 Star，
 * 用户在卡片上看不出两个按钮的区别；这里用内联 SVG 补齐，
 * 通过 filled 切换描边/实心，保持与 el-icon 一致的字号与颜色继承。
 */
defineProps({
  /** 是否实心（已点赞） */
  filled: { type: Boolean, default: false },
  /** 尺寸，默认继承字体大小 */
  size: { type: [Number, String], default: "1em" },
});
</script>

<template>
  <svg
    class="heart-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    :stroke="filled ? 'none' : 'currentColor'"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12 20.5s-7.5-4.6-7.5-9.6a4.4 4.4 0 0 1 7.5-3.1 4.4 4.4 0 0 1 7.5 3.1c0 5-7.5 9.6-7.5 9.6z"
    />
  </svg>
</template>

<style scoped>
.heart-icon {
  display: block;
  flex-shrink: 0;
}
</style>
