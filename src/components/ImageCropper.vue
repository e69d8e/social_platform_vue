<script setup>
import { ref, reactive, computed, nextTick } from "vue";
import {
  ZoomIn,
  ZoomOut,
  RefreshRight,
  RefreshLeft,
  Loading,
} from "@element-plus/icons-vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "裁切图片" },
  // 待裁切的图片：本地 File/Blob 或图片地址
  file: { type: [File, Blob, String], default: null },
  // 裁切框宽高比（宽 / 高），例如头像为 1，5:3 封面为 5 / 3
  aspectRatio: { type: Number, default: 1 },
  // 输出格式：auto（png 保持 png，其余转 jpeg）/ jpeg / png
  outputType: { type: String, default: "auto" },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const stageRef = ref(null);
const imgRef = ref(null);
const loadedUrl = ref("");
const loading = ref(false);
const failed = ref(false);
const zoom = ref(1);
const stageW = ref(0);
const stageH = ref(0);

// 当前显示图片的自然尺寸（旋转后与旋转前可能不同）
const nat = reactive({ w: 0, h: 0 });
const crop = reactive({ x: 0, y: 0, w: 0, h: 0 });

let sourceUrl = null; // 原图 objectUrl（dialog 关闭时释放）
let sourceMime = "";
let origImage = null; // 原图元素，旋转时以此为源重绘
let origW = 0;
let origH = 0;
let angle = 0; // 已烘焙进当前显示图片的总旋转角度

const MAX_ZOOM = 5;
const MIN_CROP = 48;
const busy = computed(() => loading.value || failed.value);

// ---------------- 几何计算 ----------------

const s0 = computed(() => {
  if (!nat.w || !nat.h || !stageW.value || !stageH.value) return 1;
  return Math.min(stageW.value / nat.w, stageH.value / nat.h);
});
const s = computed(() => s0.value * zoom.value);

// 显示图片的外接矩形（图片始终居中于舞台）
const bboxX = computed(() => stageW.value / 2 - (nat.w * s.value) / 2);
const bboxY = computed(() => stageH.value / 2 - (nat.h * s.value) / 2);
const bboxW = computed(() => nat.w * s.value);
const bboxH = computed(() => nat.h * s.value);

const updateStageSize = () => {
  const el = stageRef.value;
  if (!el) return;
  stageW.value = el.clientWidth;
  stageH.value = el.clientHeight;
};

const clampCrop = () => {
  const bw = bboxW.value;
  const bh = bboxH.value;
  if (!bw || !bh) return;
  if (crop.w > bw) {
    crop.w = bw;
    crop.h = bw / props.aspectRatio;
  }
  if (crop.h > bh) {
    crop.h = bh;
    crop.w = bh * props.aspectRatio;
  }
  crop.x = Math.min(Math.max(crop.x, bboxX.value), bboxX.value + bw - crop.w);
  crop.y = Math.min(Math.max(crop.y, bboxY.value), bboxY.value + bh - crop.h);
};

// 初始裁切框：占舞台较小边的 72%，居中
const initCrop = () => {
  const bw = bboxW.value;
  const bh = bboxH.value;
  if (!bw || !bh) return;
  let w = Math.min(stageW.value, stageH.value) * 0.72;
  let h = w / props.aspectRatio;
  if (w > bw) {
    w = bw;
    h = w / props.aspectRatio;
  }
  if (h > bh) {
    h = bh;
    w = h * props.aspectRatio;
  }
  crop.w = w;
  crop.h = h;
  crop.x = bboxX.value + (bw - w) / 2;
  crop.y = bboxY.value + (bh - h) / 2;
  clampCrop();
};

const setZoom = (value) => {
  zoom.value = Math.min(MAX_ZOOM, Math.max(1, value));
  clampCrop();
};

const zoomBy = (factor) => setZoom(zoom.value * factor);

const onZoomSlider = (percent) => setZoom(Number(percent) / 100);

const onWheel = (e) => {
  if (busy.value) return;
  setZoom(zoom.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
};

// ---------------- 拖拽 / 缩放裁切框 ----------------

const handles = [
  { key: "nw", sx: -1, sy: -1, cls: "handle-nw" },
  { key: "ne", sx: 1, sy: -1, cls: "handle-ne" },
  { key: "sw", sx: -1, sy: 1, cls: "handle-sw" },
  { key: "se", sx: 1, sy: 1, cls: "handle-se" },
];

let drag = null;
let startX = 0;
let startY = 0;
const startRect = { x: 0, y: 0, w: 0, h: 0 };

const onBoxDown = (e) => {
  if (busy.value) return;
  drag = { kind: "move" };
  startX = e.clientX;
  startY = e.clientY;
  Object.assign(startRect, crop);
  bindDrag();
};

const onHandleDown = (e, hx) => {
  if (busy.value) return;
  drag = { kind: "resize", ...hx };
  startX = e.clientX;
  startY = e.clientY;
  Object.assign(startRect, crop);
  bindDrag();
};

const bindDrag = () => {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
};

const onPointerUp = () => {
  drag = null;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
};

const onPointerMove = (e) => {
  if (!drag) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (drag.kind === "move") {
    crop.x = startRect.x + dx;
    crop.y = startRect.y + dy;
    clampCrop();
    return;
  }
  resizeBy(dx, dy);
};

const resizeBy = (dx, dy) => {
  const { sx, sy } = drag;
  const ratio = props.aspectRatio;
  const bw = bboxW.value;
  const bh = bboxH.value;
  // 锚定对角，可放大的最大宽高
  const maxW =
    sx === 1
      ? bboxX.value + bw - startRect.x
      : startRect.x + startRect.w - bboxX.value;
  const maxH =
    sy === 1
      ? bboxY.value + bh - startRect.y
      : startRect.y + startRect.h - bboxY.value;
  const minW = Math.min(MIN_CROP * ratio, maxW);
  const minH = Math.min(MIN_CROP, maxH);
  const rawW = startRect.w + dx * sx;
  const rawH = startRect.h + dy * sy;
  // 以相对变化更大的一侧为准，保持宽高比
  const driveByWidth =
    Math.abs(rawW - startRect.w) / (startRect.w || 1) >=
    Math.abs(rawH - startRect.h) / (startRect.h || 1);
  let w;
  let h;
  if (driveByWidth) {
    w = Math.min(Math.max(rawW, minW), maxW);
    h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    if (h < minH) {
      h = minH;
      w = h * ratio;
    }
  } else {
    h = Math.min(Math.max(rawH, minH), maxH);
    w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    if (w < minW) {
      w = minW;
      h = w / ratio;
    }
  }
  crop.w = w;
  crop.h = h;
  if (sx === -1) crop.x = startRect.x + startRect.w - w;
  if (sy === -1) crop.y = startRect.y + startRect.h - h;
};

// ---------------- 图片加载 / 旋转 / 重置 ----------------

const resolveSourceUrl = async () => {
  const source = props.file;
  if (source instanceof Blob) {
    sourceMime = source.type || "";
    return URL.createObjectURL(source);
  }
  if (typeof source === "string" && source) {
    if (source.startsWith("data:")) {
      sourceMime = source.slice(5, source.indexOf(";")) || "";
      return source;
    }
    if (source.startsWith("blob:")) return source;
    const res = await fetch(source);
    if (!res.ok) throw new Error("加载图片失败");
    const blob = await res.blob();
    sourceMime = blob.type || "";
    return URL.createObjectURL(blob);
  }
  throw new Error("未选择图片");
};

const loadOriginal = () =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      origImage = img;
      origW = img.naturalWidth;
      origH = img.naturalHeight;
      resolve();
    };
    img.onerror = () => reject(new Error("加载图片失败"));
    img.src = sourceUrl;
  });

const setDisplaySource = (url) =>
  new Promise((resolve, reject) => {
    const el = imgRef.value;
    if (!el) {
      reject(new Error("图片元素未就绪"));
      return;
    }
    el.onload = () => {
      nat.w = el.naturalWidth;
      nat.h = el.naturalHeight;
      resolve();
    };
    el.onerror = () => reject(new Error("加载图片失败"));
    if (
      loadedUrl.value &&
      loadedUrl.value !== sourceUrl &&
      loadedUrl.value.startsWith("blob:")
    ) {
      URL.revokeObjectURL(loadedUrl.value);
    }
    loadedUrl.value = url;
  });

const preferredMime = () => {
  if (props.outputType === "png") return "image/png";
  if (props.outputType === "jpeg") return "image/jpeg";
  return sourceMime === "image/png" ? "image/png" : "image/jpeg";
};

const bakeRotation = async () => {
  const swap = angle % 180 !== 0;
  const w = swap ? origH : origW;
  const h = swap ? origW : origH;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const mime = preferredMime();
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.translate(w / 2, h / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(origImage, -origW / 2, -origH / 2);
  await setDisplaySource(canvas.toDataURL(mime, 0.92));
  zoom.value = 1;
  initCrop();
};

const rotateImage = async () => {
  if (busy.value || !origImage) return;
  angle = (angle + 90) % 360;
  try {
    await bakeRotation();
  } catch {
    ElMessage.error("图片旋转失败");
  }
};

const resetCrop = async () => {
  if (busy.value || !origImage) return;
  try {
    if (angle !== 0) {
      angle = 0;
      await setDisplaySource(sourceUrl);
    }
    zoom.value = 1;
    updateStageSize();
    initCrop();
  } catch {
    ElMessage.error("图片重置失败");
  }
};

// ---------------- 输出 ----------------

const outputSize = computed(() => {
  if (!s.value || !crop.w) return "--";
  const w = Math.max(1, Math.round(crop.w / s.value));
  const h = Math.max(1, Math.round(crop.h / s.value));
  return `${w} × ${h}`;
});

const buildFileName = (mime) => {
  const ext = mime === "image/png" ? "png" : "jpg";
  const originName =
    props.file instanceof File ? props.file.name.replace(/\.[^.]+$/, "") : "";
  return `${originName || "cropped"}_crop.${ext}`;
};

const handleConfirm = () => {
  if (busy.value) return;
  const el = imgRef.value;
  if (!el || !nat.w || !nat.h || !s.value) return;
  const canvas = document.createElement("canvas");
  const natScale = 1 / s.value;
  const outW = Math.max(1, Math.round(crop.w * natScale));
  const outH = Math.max(1, Math.round(crop.h * natScale));
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  const mime = preferredMime();
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
  }
  // 与原图 1:1 对应的高清输出
  ctx.scale(natScale, natScale);
  ctx.translate(stageW.value / 2 - crop.x, stageH.value / 2 - crop.y);
  ctx.scale(s.value, s.value);
  ctx.translate(-nat.w / 2, -nat.h / 2);
  ctx.drawImage(el, 0, 0);
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        ElMessage.error("图片处理失败，请重试");
        return;
      }
      emit("confirm", new File([blob], buildFileName(mime), { type: mime }));
      visible.value = false;
    },
    mime,
    0.92,
  );
};

// ---------------- 生命周期 ----------------

const handleOpen = async () => {
  loading.value = true;
  failed.value = false;
  zoom.value = 1;
  angle = 0;
  await nextTick();
  try {
    sourceUrl = await resolveSourceUrl();
    await loadOriginal();
    await setDisplaySource(sourceUrl);
    updateStageSize();
    initCrop();
    window.addEventListener("resize", onWinResize);
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
};

const onWinResize = () => {
  updateStageSize();
  initCrop();
};

const handleClosed = () => {
  window.removeEventListener("resize", onWinResize);
  if (drag) onPointerUp();
  if (sourceUrl && sourceUrl.startsWith("blob:")) {
    URL.revokeObjectURL(sourceUrl);
  }
  if (
    loadedUrl.value &&
    loadedUrl.value !== sourceUrl &&
    loadedUrl.value.startsWith("blob:")
  ) {
    URL.revokeObjectURL(loadedUrl.value);
  }
  loadedUrl.value = "";
  sourceUrl = null;
  origImage = null;
  nat.w = 0;
  nat.h = 0;
};

// ---------------- 样式辅助 ----------------

const imgStyle = computed(() => ({
  width: `${nat.w}px`,
  height: `${nat.h}px`,
  transform: `translate(-50%, -50%) scale(${s.value})`,
}));

const boxStyle = computed(() => ({
  left: `${crop.x}px`,
  top: `${crop.y}px`,
  width: `${crop.w}px`,
  height: `${crop.h}px`,
}));
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="min(660px, 94vw)"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
    @open="handleOpen"
    @closed="handleClosed"
  >
    <div class="cropper">
      <div ref="stageRef" class="stage" @wheel.prevent="onWheel">
        <img
          v-show="!busy"
          ref="imgRef"
          :src="loadedUrl"
          :style="imgStyle"
          class="source-img"
          draggable="false"
          alt="待裁切图片"
        />

        <div
          v-show="!busy"
          class="crop-box"
          :style="boxStyle"
          @pointerdown.prevent.stop="onBoxDown"
        >
          <span class="grid-lines" />
          <span
            v-for="hx in handles"
            :key="hx.key"
            class="handle"
            :class="hx.cls"
            @pointerdown.prevent.stop="onHandleDown($event, hx)"
          />
        </div>

        <div v-if="loading" class="stage-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>图片加载中…</span>
        </div>
        <div v-else-if="failed" class="stage-tip">
          <span>图片加载失败，请重新选择</span>
        </div>
      </div>

      <div class="toolbar">
        <el-button
          circle
          size="small"
          :icon="ZoomOut"
          :disabled="busy"
          title="缩小"
          @click="zoomBy(1 / 1.15)"
        />
        <el-slider
          class="zoom-slider"
          :model-value="Math.round(zoom * 100)"
          :min="100"
          :max="500"
          :step="5"
          :disabled="busy"
          @input="onZoomSlider"
        />
        <el-button
          circle
          size="small"
          :icon="ZoomIn"
          :disabled="busy"
          title="放大"
          @click="zoomBy(1.15)"
        />
        <el-divider direction="vertical" />
        <el-button
          circle
          size="small"
          :icon="RefreshRight"
          :disabled="busy"
          title="旋转 90°"
          @click="rotateImage"
        />
        <el-button
          circle
          size="small"
          :icon="RefreshLeft"
          :disabled="busy"
          title="重置"
          @click="resetCrop"
        />
      </div>

      <div class="tip">
        <span>拖动选框移动 · 拖动角点调整大小 · 滚轮或滑块缩放</span>
        <span class="out-size">输出尺寸 {{ outputSize }}</span>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="busy" @click="handleConfirm">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.cropper {
  .stage {
    position: relative;
    height: 340px;
    background: var(--el-fill-color-darker);
    border-radius: 8px;
    overflow: hidden;
    user-select: none;
    touch-action: none;

    .source-img {
      position: absolute;
      left: 50%;
      top: 50%;
      max-width: none;
      max-height: none;
      transform-origin: center;
    }

    .crop-box {
      position: absolute;
      border: 1px solid #ffffff;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      cursor: move;

      .grid-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(
            to right,
            rgba(255, 255, 255, 0.45) 1px,
            transparent 1px
          ),
          linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.45) 1px,
            transparent 1px
          );
        background-size:
          calc(100% / 3) 100%,
          100% calc(100% / 3);
      }

      .handle {
        position: absolute;
        z-index: 1;
        width: 12px;
        height: 12px;
        background: #ffffff;
        border: 2px solid var(--el-color-primary);
        border-radius: 2px;
      }

      .handle-nw {
        left: -6px;
        top: -6px;
        cursor: nwse-resize;
      }

      .handle-ne {
        right: -6px;
        top: -6px;
        cursor: nesw-resize;
      }

      .handle-sw {
        left: -6px;
        bottom: -6px;
        cursor: nesw-resize;
      }

      .handle-se {
        right: -6px;
        bottom: -6px;
        cursor: nwse-resize;
      }
    }

    .stage-tip {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;

    .zoom-slider {
      flex: 1;
      margin: 0 4px;
    }
  }

  .tip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    .out-size {
      white-space: nowrap;
    }
  }
}
</style>
