import { computeFileHash } from "@/utils/fileHash";
import { checkFileHashApi } from "@/api/uploadApi";

/**
 * 秒传上传：先按 SHA-256 预检，命中则直接复用服务端已有 URL 跳过整个文件传输；
 * 未命中或预检失败（网络/接口异常）时回退正常上传。
 *
 * @param {File} file 待上传文件（应为压缩后的产物）
 * @param {Object} [options]
 * @param {(file: File, postId?: any) => Promise} [options.upload] 正常上传接口
 * @param {any} [options.postId] 帖子 id（帖子图片场景用于服务端登记归属）
 * @returns {Promise<string|null>} 上传后的资源 URL
 */
export async function uploadWithDedup(file, { upload, postId } = {}) {
  let url = null;
  try {
    const hash = await computeFileHash(file);
    const check = await checkFileHashApi(hash, postId);
    if (check.data.code === 1 && check.data.data) url = check.data.data;
  } catch {
    // 预检失败回退正常上传
  }
  if (!url) {
    const res = await upload(file, postId);
    url = res?.data?.data || null;
  }
  return url;
}
