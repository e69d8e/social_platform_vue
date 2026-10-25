import DOMPurify from "dompurify";

/**
 * 简易 Markdown 渲染器（AI 助手消息用）。
 * 已做 HTML 转义 + DOMPurify 双重防护，渲染结果可直接用于 v-html。
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 行内 Markdown 渲染
function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

export function renderMarkdown(md) {
  if (!md) return "";
  const src = String(md).replace(/\r\n?/g, "\n");

  // 1. 提取围栏代码块
  const blocks = [];
  const text = src.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (m, lang, code) => {
    blocks.push({ lang: lang.trim(), code: code.replace(/\n$/, "") });
    return `\uE000${blocks.length - 1}\uE000`;
  });

  const lines = text.split("\n");
  const out = [];
  let list = null;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // 代码块占位符
    if (/^\uE000\d+\uE000$/.test(trimmed)) {
      closeList();
      out.push(trimmed);
      continue;
    }

    // 空行结束列表
    if (!trimmed) {
      closeList();
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // 分割线
    if (/^([-*_])(\s*\1){2,}\s*$/.test(trimmed)) {
      closeList();
      out.push("<hr />");
      continue;
    }

    // 引用
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    // 无序列表
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    // 有序列表
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    // 普通段落
    closeList();
    out.push(`<p>${renderInline(trimmed)}</p>`);
  }
  closeList();

  let html = out.join("\n");

  // 2. 回填代码块
  html = html.replace(/\uE000(\d+)\uE000/g, (m, i) => {
    const b = blocks[Number(i)];
    const cls = b.lang ? ` class="language-${escapeHtml(b.lang)}"` : "";
    return `<pre><code${cls}>${escapeHtml(b.code)}</code></pre>`;
  });

  return DOMPurify.sanitize(html);
}

// 渲染缓存：流式输出时仅最后一条变化，其余消息避免重复解析
const mdCache = new Map();

export function renderCached(content) {
  if (!content) return "";
  if (mdCache.has(content)) return mdCache.get(content);
  const html = renderMarkdown(content);
  if (mdCache.size > 300) mdCache.clear();
  mdCache.set(content, html);
  return html;
}
