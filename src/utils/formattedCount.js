/**
 * 数字中文化缩写：1234 / 1.2万 / 1.2亿
 *
 * 之前的实现是「1.0 k / 1.0 w」的混搭写法：
 *   - 中文界面里 k / w 会打断阅读；
 *   - 9999 会显示成 10.0 k，而 10000 显示 1.0 w，量级跳变不连贯。
 * 这里统一为中文单位，并保证进位后仍能读得懂（不会出现 10.0万 这种 5 位精度）。
 *
 * @param {number|string} count 原始数值
 * @returns {string} 展示用字符串
 */
export default function formattedCount(count) {
  const num = Number(count);
  if (!Number.isFinite(num) || num <= 0) return "0";

  // 一万以下直接展示整数，避免「9999 → 1.0万」前后跳变
  if (num < 10000) return String(Math.floor(num));

  const trim = (value) => {
    // 保留一位小数，整数时不显示 .0
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  if (num < 100000000) return `${trim(num / 10000)}万`;
  return `${trim(num / 100000000)}亿`;
}
