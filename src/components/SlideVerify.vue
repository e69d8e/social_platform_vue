<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from "vue";
import { ArrowRight, Check, Close, RefreshRight } from "@element-plus/icons-vue";

const props = defineProps({
  w: { type: Number, default: 310 },
  h: { type: Number, default: 155 },
  l: { type: Number, default: 42 },
  r: { type: Number, default: 10 },
  sliderText: { type: String, default: "向右滑动完成验证" },
  accuracy: { type: Number, default: 3 },
  imgs: { type: Array, default: () => [] },
  offset: { type: Number, default: 0 },
});

const emit = defineEmits(["success", "fail", "again", "refresh"]);

const PI = Math.PI;

const canvasRef = ref(null);
const blockRef = ref(null);
const sliderRef = ref(null);

const blockX = ref(0);
const blockY = ref(0);
const loading = ref(true);

const sliderState = reactive({
  isMouseDown: false,
  status: "default", // 'default' | 'active' | 'success' | 'fail'
  sliderLeft: 0,
  blockLeft: 0,
  startX: 0,
  startY: 0,
  startTime: 0,
  trail: [],
});

let isDestroyed = false;
let currentImg = null;

function getRandomNumberByRange(start, end) {
  return Math.round(Math.random() * (end - start) + start);
}

function getRandomImg() {
  const len = props.imgs.length;
  if (len > 0) {
    return props.imgs[getRandomNumberByRange(0, len - 1)];
  }
  return "https://picsum.photos/300/150?image=" + getRandomNumberByRange(0, 1084);
}

function draw(ctx, x, y, l, r, operation) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
  ctx.lineTo(x + l, y);
  ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI);
  ctx.lineTo(x + l, y + l);
  ctx.lineTo(x, y + l);
  ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true);
  ctx.lineTo(x, y);
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.stroke();
  ctx[operation]();
  ctx.globalCompositeOperation = "destination-over";
}

const reset = () => {
  sliderState.status = "default";
  sliderState.sliderLeft = 0;
  sliderState.blockLeft = 0;
  sliderState.isMouseDown = false;
  sliderState.trail = [];
  if (blockRef.value) {
    blockRef.value.style.left = "0px";
  }
};

const initImg = () => {
  if (isDestroyed || !canvasRef.value || !blockRef.value) return;
  loading.value = true;
  reset();

  const canvas = canvasRef.value;
  const block = blockRef.value;
  const canvasCtx = canvas.getContext("2d");
  const blockCtx = block.getContext("2d", { willReadFrequently: true });

  const L = props.l + props.r * 2 + 3;
  const minOffset = L + 10;
  const maxOffset = props.w - (L + 10);

  if (props.offset >= minOffset && props.offset <= maxOffset) {
    blockX.value = props.offset;
  } else if (props.offset > 0) {
    blockX.value = Math.min(Math.max(props.offset, minOffset), maxOffset);
  } else {
    blockX.value = getRandomNumberByRange(minOffset, maxOffset);
  }
  blockY.value = getRandomNumberByRange(10 + props.r * 2, props.h - (L + 10));

  const img = document.createElement("img");
  img.crossOrigin = "Anonymous";
  currentImg = img;

  img.onload = () => {
    if (isDestroyed || !canvasRef.value || !blockRef.value || currentImg !== img) return;
    loading.value = false;

    canvasCtx.clearRect(0, 0, props.w, props.h);
    blockCtx.clearRect(0, 0, props.w, props.h);
    block.width = props.w;

    draw(canvasCtx, blockX.value, blockY.value, props.l, props.r, "fill");
    draw(blockCtx, blockX.value, blockY.value, props.l, props.r, "clip");

    canvasCtx.drawImage(img, 0, 0, props.w, props.h);
    blockCtx.drawImage(img, 0, 0, props.w, props.h);

    const y = blockY.value - props.r * 2 - 1;
    const imgData = blockCtx.getImageData(blockX.value, y, L, L);
    block.width = L;
    blockCtx.putImageData(imgData, 0, y);
  };

  img.onerror = () => {
    if (isDestroyed) return;
    img.src = getRandomImg();
  };

  img.src = getRandomImg();
};

const handleRefresh = () => {
  initImg();
  emit("refresh");
};

// 拖拽事件处理
const onDragStart = (e) => {
  if (sliderState.status === "success" || loading.value) return;
  sliderState.isMouseDown = true;
  sliderState.status = "active";
  sliderState.startTime = Date.now();
  sliderState.trail = [];

  const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  sliderState.startX = clientX;
  sliderState.startY = clientY;
};

const updatePosition = (clientX, clientY) => {
  const maxMove = props.w - 40;
  const moveX = Math.max(0, Math.min(clientX - sliderState.startX, maxMove));
  sliderState.sliderLeft = moveX;
  const blockLeft = ((props.w - 40 - 20) / (props.w - 40)) * moveX;
  sliderState.blockLeft = blockLeft;
  if (blockRef.value) {
    blockRef.value.style.left = `${blockLeft}px`;
  }
  if (clientY !== undefined) {
    sliderState.trail.push(clientY - sliderState.startY);
  }
};

const onDragMove = (e) => {
  if (!sliderState.isMouseDown) return;
  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  if (clientX === undefined) return;
  updatePosition(clientX, clientY);
};

const onDragEnd = (e) => {
  if (!sliderState.isMouseDown) return;
  sliderState.isMouseDown = false;

  const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? (sliderState.startX + sliderState.sliderLeft);
  const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? sliderState.startY;
  // 确保使用松手时的真实坐标，彻底消除节流延迟
  updatePosition(clientX, clientY);

  const duration = Date.now() - sliderState.startTime;
  const currentLeft = sliderState.blockLeft;
  const targetX = blockX.value;
  const isSpliced = Math.abs(currentLeft - targetX) <= props.accuracy;

  if (isSpliced) {
    sliderState.status = "success";
    emit("success", {
      timestamp: duration,
      left: parseFloat(currentLeft.toFixed(2)),
    });
  } else {
    sliderState.status = "fail";
    emit("fail");
    setTimeout(() => {
      reset();
      emit("again");
    }, 800);
  }
};

watch(
  () => props.offset,
  () => {
    initImg();
  }
);

onMounted(() => {
  initImg();
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchmove", onDragMove);
  window.addEventListener("touchend", onDragEnd);
});

onBeforeUnmount(() => {
  isDestroyed = true;
  currentImg = null;
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
});
</script>

<template>
  <div class="slide-verify" :style="{ width: `${w}px` }">
    <!-- 验证码图片与拼图画布 -->
    <div class="canvas-wrapper" :style="{ width: `${w}px`, height: `${h}px` }">
      <div v-if="loading" class="slide-verify-loading">
        <el-icon class="is-loading"><RefreshRight /></el-icon>
      </div>
      <canvas ref="canvasRef" :width="w" :height="h" class="main-canvas" />
      <canvas ref="blockRef" :width="w" :height="h" class="block-canvas" />
      <div class="slide-verify-refresh-icon" @click="handleRefresh" title="刷新验证码">
        <el-icon><RefreshRight /></el-icon>
      </div>
    </div>

    <!-- 滑动轨道 -->
    <div
      ref="sliderRef"
      class="slide-verify-slider"
      :class="`container-${sliderState.status}`"
      :style="{ width: `${w}px` }"
    >
      <div
        class="slide-verify-slider-mask"
        :style="{ width: `${sliderState.sliderLeft}px` }"
      />
      <div
        class="slide-verify-slider-mask-item"
        :style="{ left: `${sliderState.sliderLeft}px` }"
        @mousedown.prevent="onDragStart"
        @touchstart.prevent="onDragStart"
      >
        <el-icon v-if="sliderState.status === 'success'" class="slider-icon"><Check /></el-icon>
        <el-icon v-else-if="sliderState.status === 'fail'" class="slider-icon"><Close /></el-icon>
        <el-icon v-else class="slider-icon"><ArrowRight /></el-icon>
      </div>
      <span class="slide-verify-slider-text">
        {{ sliderState.status === "default" ? sliderText : "" }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.slide-verify {
  position: relative;
  user-select: none;

  .canvas-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: 4px;

    .slide-verify-loading {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: var(--el-color-primary);
      z-index: 10;
    }

    .main-canvas {
      display: block;
    }

    .block-canvas {
      position: absolute;
      left: 0;
      top: 0;
    }

    .slide-verify-refresh-icon {
      position: absolute;
      right: 4px;
      top: 4px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      font-size: 20px;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 50%;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.6);
        transform: rotate(90deg);
      }
    }
  }

  .slide-verify-slider {
    position: relative;
    text-align: center;
    height: 40px;
    line-height: 40px;
    margin-top: 14px;
    background: #f7f9fa;
    color: #45494c;
    border: 1px solid #e4e7eb;
    border-radius: 4px;

    .slide-verify-slider-mask {
      position: absolute;
      left: 0;
      top: 0;
      height: 38px;
      border: 0 solid #1991fa;
      background: #d1e9fe;
    }

    .slide-verify-slider-mask-item {
      position: absolute;
      left: 0;
      top: -1px;
      width: 40px;
      height: 40px;
      background: #fff;
      box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e4e7eb;
      border-radius: 4px;
      transition: background 0.15s ease;

      &:hover {
        background: #1991fa;
        color: #fff;
      }

      .slider-icon {
        font-size: 18px;
      }
    }

    .slide-verify-slider-text {
      position: relative;
      z-index: 1;
      font-size: 13px;
      color: #606266;
    }

    &.container-active {
      .slide-verify-slider-mask {
        border-width: 1px;
      }
      .slide-verify-slider-mask-item {
        background: #1991fa;
        color: #fff;
        border-color: #1991fa;
      }
    }

    &.container-success {
      .slide-verify-slider-mask {
        border: 1px solid #67c23a;
        background-color: #e1f3d8;
      }
      .slide-verify-slider-mask-item {
        background: #67c23a !important;
        color: #fff;
        border-color: #67c23a;
      }
    }

    &.container-fail {
      .slide-verify-slider-mask {
        border: 1px solid #f56c6c;
        background-color: #fde2e2;
      }
      .slide-verify-slider-mask-item {
        background: #f56c6c !important;
        color: #fff;
        border-color: #f56c6c;
      }
    }
  }
}
</style>
