/**
 * 相对时间格式化：刚刚 / N分钟前 / N小时前 / 昨天 / N天前 / 日期
 * 只接受字符串，解析失败时原样返回，保证任何脏数据都有兜底
 */
export function formatRelativeTime(value) {
  if (!value) return "";
  const text = typeof value === "string" ? value : String(value);
  const date = new Date(text.replace(/-/g, "/").replace(/T/g, " "));
  if (Number.isNaN(date.getTime())) return text;

  const now = Date.now();
  const diff = now - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨天";

  if (diff < 30 * day) return `${Math.floor(diff / day)}天前`;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dayNum = date.getDate();
  if (year === new Date(now).getFullYear()) return `${month}月${dayNum}日`;
  return `${year}年${month}月${dayNum}日`;
}

/**
 * 精确时间格式化：YYYY-MM-DD HH:mm（精确到分钟）
 * 只接受字符串，解析失败时原样返回
 */
export function formatExactTime(value) {
  if (!value) return "";
  const text = typeof value === "string" ? value : String(value);
  const date = new Date(text.replace(/-/g, "/").replace(/T/g, " "));
  if (Number.isNaN(date.getTime())) return text;

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default formatRelativeTime;
