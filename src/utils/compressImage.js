/**
 * 图片压缩工具：等比缩放 + 质量压缩
 * 原则：上传前先压缩，大小校验一律针对压缩后的结果。
 * 输出 jpg；png 原图含有透明像素时保留 png 以避免透明区域变黑。
 */

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = src;
  });

const canvasToBlob = (canvas, mime, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片编码失败"))),
      mime,
      quality,
    );
  });

// 检测图片是否含透明像素（png 转 jpg 会让透明区域变黑，需保留 png）
const hasAlpha = (ctx, w, h) => {
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
};

/**
 * 压缩图片，返回可直接上传的 File
 * @param {File|Blob} file 原始图片（视作图片内容）
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1920] 最大输出宽度（超出等比缩小）
 * @param {number} [options.maxHeight=1920] 最大输出高度（超出等比缩小）
 * @param {number} [options.quality=0.85] jpeg 输出质量 0-1
 * @returns {Promise<File>} 压缩后的图片文件
 */
export default async function compressImage(
  file,
  { maxWidth = 1920, maxHeight = 1920, quality = 0.85 } = {},
) {
  if (!(file instanceof Blob)) throw new Error("无效的图片文件");

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { naturalWidth: w, naturalHeight: h } = img;

    const scale = Math.min(1, maxWidth / w, maxHeight / h);
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    // jpeg 无透明通道，先铺白底，防止透明图片压缩后变黑
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    const keepPng =
      (file.type === "image/png" || !file.type) && hasAlpha(ctx, outW, outH);
    const mime = keepPng ? "image/png" : "image/jpeg";
    const blob = await canvasToBlob(
      canvas,
      mime,
      mime === "image/jpeg" ? quality : undefined,
    );

    const baseName =
      file instanceof File ? file.name.replace(/\.[^.]+$/, "") : "image";
    const ext = mime === "image/png" ? "png" : "jpg";
    return new File([blob], `${baseName}.${ext}`, { type: mime });
  } finally {
    URL.revokeObjectURL(url);
  }
}
