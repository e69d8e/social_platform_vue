<script setup>
import { reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { ArrowRight, Check, RefreshRight } from "@element-plus/icons-vue";

const props = defineProps({
  w: { type: Number, default: 310 },
  h: { type: Number, default: 155 },
  l: { type: Number, default: 42 },
  r: { type: Number, default: 10 },
  sliderText: { type: String, default: "向右滑动完成验证" },
  // 后端渲染的图片：缺口位置由服务端掌握，前端不再知道答案
  bgImage: { type: String, default: "" },
  blockImage: { type: String, default: "" },
  y: { type: Number, default: 0 },
});

const emit = defineEmits(["success", "refresh"]);

// 与后端 SlideCaptchaImageUtil 对应：L = l + r*2 + 3，拼图块顶边 = y - r*2 - 1
const pieceSize = computed(() => props.l + props.r * 2 + 3);
const pieceTop = computed(() => props.y - props.r * 2 - 1);
// 拖动距离低于该值视为误触，不提交校验（不消耗验证码）
const MIN_DRAG = 10;

const sliderState = reactive({
  isMouseDown: false,
  status: "default", // 'default' | 'active' | 'success'
  sliderLeft: 0,
  blockLeft: 0,
  startX: 0,
  startY: 0,
  startTime: 0,
  trail: [],
});

const reset = () => {
  sliderState.status = "default";
  sliderState.sliderLeft = 0;
  sliderState.blockLeft = 0;
  sliderState.isMouseDown = false;
  sliderState.trail = [];
};

const handleRefresh = () => {
  reset();
  emit("refresh");
};

// 拖拽事件处理
const onDragStart = (e) => {
  if (sliderState.status === "success") return;
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

  const clientX =
    e.clientX ??
    e.changedTouches?.[0]?.clientX ??
    sliderState.startX + sliderState.sliderLeft;
  const clientY =
    e.clientY ?? e.changedTouches?.[0]?.clientY ?? sliderState.startY;
  // 确保使用松手时的真实坐标，彻底消除节流延迟
  updatePosition(clientX, clientY);

  const currentLeft = sliderState.blockLeft;
  if (currentLeft <= MIN_DRAG) {
    reset();
    return;
  }

  const duration = Date.now() - sliderState.startTime;
  // 前端不再本地预判对错（不知道答案），统一提交后端校验；
  // 校验失败由父组件刷新新验证码（通过 :key 重新挂载）
  sliderState.status = "success";
  emit("success", {
    timestamp: duration,
    left: parseFloat(currentLeft.toFixed(2)),
  });
};

watch(
  () => props.bgImage,
  () => {
    reset();
  },
);

onMounted(() => {
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchmove", onDragMove);
  window.addEventListener("touchend", onDragEnd);
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
});
</script>

<template>
  <div class="slide-verify" :style="{ width: `${w}px` }">
    <!-- 服务端渲染的验证码图片与拼图块 -->
    <div class="canvas-wrapper" :style="{ width: `${w}px`, height: `${h}px` }">
      <img
        :src="'data:image/png;base64,' + bgImage"
        class="main-img"
        alt="滑块验证码"
        draggable="false"
      />
      <img
        v-if="blockImage"
        :src="'data:image/png;base64,' + blockImage"
        class="block-img"
        :style="{
          left: `${sliderState.blockLeft}px`,
          top: `${pieceTop}px`,
          width: `${pieceSize}px`,
          height: `${pieceSize}px`,
        }"
        alt=""
        draggable="false"
      />
      <div
        class="slide-verify-refresh-icon"
        @click="handleRefresh"
        title="刷新验证码"
      >
        <el-icon><RefreshRight /></el-icon>
      </div>
    </div>

    <!-- 滑动轨道 -->
    <div
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
        <el-icon v-if="sliderState.status === 'success'" class="slider-icon"
          ><Check
        /></el-icon>
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

    .main-img {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .block-img {
      position: absolute;
      left: 0;
      top: 0;
      pointer-events: none;
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
  }
}
</style>
