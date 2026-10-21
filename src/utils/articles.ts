import { marked } from "marked";
import { articleEditorialData } from "../data/article-editorial";
import { ASSET_BASE } from "../env";
import type { ArticleDetail, ArticleSummary } from "../types";
export const assetUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith(ASSET_BASE) && ASSET_BASE !== "/") return path;
  return ASSET_BASE + path.replace(/^\//, "");
};
export const articleCategory = (item: ArticleSummary) =>
  /植物志|花名册|分类学/.test(item.title) ? "名字与学问" : "校园手记";
export const articleEditorial = (item: ArticleSummary) =>
  articleEditorialData[item.slug] ?? {
    cover: item.coverImage || "",
    summary: "",
    order: 99,
  };
export const articleCover = (item: ArticleSummary) => {
  const cover = articleEditorial(item).cover;
  return cover ? assetUrl(cover) : "";
};
export function renderArticle(article: ArticleDetail) {
  const doc = new DOMParser().parseFromString(
    marked.parse(article.markdown, { async: false }) as string,
    "text/html",
  );
  doc
    .querySelectorAll(
      "script,style,iframe,object,embed,form,input,button,svg,math,link,meta,base",
    )
    .forEach((el) => el.remove());
  const allowed = new Set([
    "P",
    "DIV",
    "SECTION",
    "SPAN",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "A",
    "IMG",
    "UL",
    "OL",
    "LI",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "DEL",
    "BR",
    "HR",
    "BLOCKQUOTE",
    "PRE",
    "CODE",
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TH",
    "TD",
    "COLGROUP",
    "COL",
    "SUP",
    "SUB",
    "FIGURE",
    "FIGCAPTION",
  ]);
  const base = new URL(assetUrl(article.basePath), window.location.origin);
  const colorProbe = document.createElement("canvas").getContext("2d");
  for (const el of [...doc.body.querySelectorAll<HTMLElement>("*")]) {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      continue;
    }
    const originalStyle = el.style;
    // 保留原文具有意义的颜色、强调和对齐，移除公众号固定宽高与字号。
    const keepStyle = [
      "color",
      "font-style",
      "font-weight",
      "text-align",
      "text-decoration",
    ]
      .map((p) => [p, originalStyle.getPropertyValue(p)])
      .filter(([, v]) => v && !/url|expression/i.test(v!));
    for (const attr of [...el.attributes]) {
      if (
        !["src", "href", "alt", "title", "colspan", "rowspan"].includes(
          attr.name,
        )
      )
        el.removeAttribute(attr.name);
    }
    for (const [p, v] of keepStyle) el.style.setProperty(p!, v!);
    // Original white headings relied on colored blocks removed by the reader.
    // Let light foregrounds inherit the reader's ink to keep them readable.
    const color = el.style.color;
    let channels = color.match(
      /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/,
    );
    if (color && !channels && colorProbe) {
      colorProbe.fillStyle = "#000000";
      colorProbe.fillStyle = color;
      const hex = colorProbe.fillStyle.match(/^#([\da-f]{6})$/i)?.[1];
      if (hex)
        channels = [
          "",
          ...[0, 2, 4].map((i) => String(parseInt(hex.slice(i, i + 2), 16))),
        ] as RegExpMatchArray;
    }
    if (
      /^(white|whitesmoke|snow|ivory|floralwhite|ghostwhite|transparent)$/i.test(
        color,
      ) ||
      (channels && channels.slice(1, 4).every((value) => Number(value) > 200))
    ) {
      el.style.removeProperty("color");
    }
    // Keep original emphasis hues while giving dark paper a readable counterpart.
    if (el.style.color && channels) {
      const [r, g, b] = channels.slice(1, 4).map(Number) as [
        number,
        number,
        number,
      ];
      const linear = (channel: number) => {
        const v = channel / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (red: number, green: number, blue: number) =>
        0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
      const background = luminance(34, 36, 40);
      let lift = 0;
      let dark = [r, g, b];
      while (
        (luminance(dark[0]!, dark[1]!, dark[2]!) + 0.05) / (background + 0.05) <
          4.5 &&
        lift < 1
      ) {
        lift += 0.05;
        dark = [r, g, b].map((channel) =>
          Math.round(channel + (255 - channel) * Math.min(1, lift)),
        );
      }
      el.style.setProperty("--article-light-color", color);
      el.style.setProperty("--article-dark-color", `rgb(${dark.join(", ")})`);
      el.style.color = "var(--article-color)";
    }
    for (const attr of ["src", "href"]) {
      if (!el.hasAttribute(attr)) continue;
      try {
        const url = new URL(el.getAttribute(attr)!, base);
        if (
          !(
            attr === "href"
              ? ["https:", "http:", "mailto:"]
              : ["https:", "http:"]
          ).includes(url.protocol)
        )
          el.removeAttribute(attr);
        else el.setAttribute(attr, url.href);
      } catch {
        el.removeAttribute(attr);
      }
    }
    if (el.tagName === "IMG") {
      el.setAttribute("loading", "lazy");
      el.setAttribute("decoding", "async");
      if (!el.getAttribute("alt"))
        el.setAttribute("alt", article.title + " · 文章配图");
    }
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
  const toc = [...doc.body.querySelectorAll("h1,h2,h3")].map((el, i) => {
    const id = "article-section-" + i;
    el.id = id;
    return { id, text: el.textContent?.trim() || "章节" };
  });
  for (const table of [...doc.body.querySelectorAll("table")]) {
    const wrapper = doc.createElement("div");
    wrapper.className = "article-table";
    wrapper.setAttribute("tabindex", "0");
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "文章表格，可横向滚动");
    table.before(wrapper);
    wrapper.append(table);
  }
  return { html: doc.body.innerHTML, toc };
}
