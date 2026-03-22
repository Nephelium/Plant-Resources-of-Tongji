# 文章精选放置说明

请将文章放在本目录下，每篇文章一个子目录，推荐结构如下：

```text
frontend/public/articles/
├─ my-first-article/
│  ├─ index.md
│  └─ images/
│     ├─ cover.jpg
│     └─ detail-1.png
└─ another-article/
   ├─ README.md
   └─ images/
```

约定：
- 子目录名将作为文章 slug。
- `index.md`、`README.md`、`article.md` 之一会被自动识别为正文文件。
- Markdown 一级标题会被自动识别为文章标题。
- 图片请使用相对路径，例如：`![图](images/cover.jpg)`。
