<script setup>
defineProps({
  /** 骨架卡片数量 */
  count: { type: Number, default: 8 },
  /** post：帖子卡片骨架；user：用户卡片骨架 */
  type: { type: String, default: "post" },
});
</script>

<template>
  <div class="skeleton-grid card-grid" aria-hidden="true">
    <div v-for="i in count" :key="i" class="cell">
      <!-- 帖子卡片骨架 -->
      <div v-if="type === 'post'" class="sk-card">
        <div class="skeleton sk-media" />
        <div class="sk-body">
          <div class="skeleton sk-line w-85" />
          <div class="skeleton sk-line w-60" />
          <div class="skeleton sk-line w-full" />
        </div>
      </div>

      <!-- 用户卡片骨架 -->
      <div v-else class="sk-card">
        <div class="sk-head">
          <div class="skeleton sk-avatar" />
          <div class="sk-head-lines">
            <div class="skeleton sk-line w-60" />
            <div class="skeleton sk-line w-35" />
          </div>
        </div>
        <div class="sk-body">
          <div class="skeleton sk-line w-full" />
          <div class="skeleton sk-line w-70" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (min-width: 680px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

@media (min-width: 980px) {
  .skeleton-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

@media (min-width: 1240px) {
  .skeleton-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 18px;
  }
}

@media (max-width: 440px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.sk-card {
  height: 100%;
  min-height: 210px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.sk-media {
  aspect-ratio: 16 / 10;
  border-radius: 0;
  flex-shrink: 0;
}

.sk-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 16px 12px;
}

.sk-head + .sk-body {
  padding-top: 0;
}

.sk-head-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  flex: 1;
}

.sk-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sk-line {
  height: 14px;
  border-radius: $radius-xs;

  &.w-85 {
    width: 85%;
  }

  &.w-60 {
    width: 60%;
  }

  &.w-35 {
    width: 35%;
  }

  &.w-70 {
    width: 70%;
  }

  &.w-full {
    width: 100%;
  }
}
</style>
