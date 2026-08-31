<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { debounce } from "lodash-es";
import { Top } from "@element-plus/icons-vue";

const visible = ref(false);

const onScroll = debounce(() => {
  const top =
    document.documentElement.scrollTop || document.body.scrollTop || 0;
  visible.value = top > 480;
}, 120);

const scrollToTop = () => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
};

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
});

onUnmounted(() => {
  onScroll.cancel();
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <Transition name="back-top">
    <button
      v-show="visible"
      class="back-top"
      type="button"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <el-icon :size="18"><Top /></el-icon>
    </button>
  </Transition>
</template>

<style lang="scss" scoped>
.back-top {
  position: fixed;
  right: 28px;
  bottom: 44px;
  z-index: 300;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--gradient-primary);
  box-shadow: var(--shadow-lg);
  transition:
    transform $transition-base,
    box-shadow $transition-base;

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--glow-primary);
  }

  &:active {
    transform: scale(0.94);
  }
}

// 出场动画
.back-top-enter-active,
.back-top-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.back-top-enter-from,
.back-top-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.85);
}

@media (max-width: 768px) {
  .back-top {
    right: 16px;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    width: 40px;
    height: 40px;
  }
}
</style>
