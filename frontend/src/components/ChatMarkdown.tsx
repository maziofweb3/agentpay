"use client";

/**
 * Lightweight markdown renderer for AI chat bubbles.
 * Avoids adding a heavy dependency; covers the patterns models use most often.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  let s = escapeHtml(text);
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code class="chat-md-code">$1</code>');
  // bold first so italic does not eat **
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // single-asterisk italic (after bold removed)
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");
  return s;
}

function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(listType === "ul" ? "</ul>" : "</ol>");
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // fenced code
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(
          `<pre class="chat-md-pre"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`
        );
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level} class="chat-md-h">${inlineFormat(h[2])}</h${level}>`);
      continue;
    }

    // unordered list
    const ul = line.match(/^\s*[-*+]\s+(.+)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push('<ul class="chat-md-ul">');
        listType = "ul";
      }
      out.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    // ordered list
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push('<ol class="chat-md-ol">');
        listType = "ol";
      }
      out.push(`<li>${inlineFormat(ol[1])}</li>`);
      continue;
    }

    // blank line → paragraph break
    if (line.trim() === "") {
      closeList();
      out.push('<div class="chat-md-gap"></div>');
      continue;
    }

    closeList();
    out.push(`<p class="chat-md-p">${inlineFormat(line)}</p>`);
  }

  if (inCode) {
    out.push(
      `<pre class="chat-md-pre"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`
    );
  }
  closeList();

  return out.join("");
}

export function ChatMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const html = renderMarkdown(text || "");
  return (
    <div
      className={`chat-md ${className}`}
      // Content is escaped before formatting; only our tags are injected.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
