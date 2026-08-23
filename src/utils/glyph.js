/**
 * 章纹取字：从标题/正文提取用于水印装饰的单字。
 * 优先取标题首字；标题为空时退回首字为「文」的章纹字符。
 */
export function pickGlyphChar(text, fallback = "文") {
  if (!text) return fallback;
  const cleaned = String(text).replace(/[【】[\]()（）·\s]/g, "");
  return cleaned.charAt(0) || fallback;
}

export default pickGlyphChar;
