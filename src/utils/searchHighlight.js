import DOMPurify from "dompurify";

/**
 * 安全地高亮文本中的关键词
 * @param {string} text - 原文本
 * @param {string} keyword - 搜索关键词
 * @returns {string} 包含 <mark class="search-highlight"> 的 HTML 字符串（已安全净化）
 */
export function highlightKeyword(text, keyword) {
  if (!text) return "";
  if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
    return DOMPurify.sanitize(String(text));
  }

  const rawText = String(text);
  const cleanKeyword = keyword.trim();
  // 转义正则特殊字符
  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  // 替换为高亮 mark 标签
  const highlighted = rawText.replace(
    regex,
    '<mark class="search-highlight">$1</mark>',
  );

  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: ["class"],
  });
}

export default highlightKeyword;
