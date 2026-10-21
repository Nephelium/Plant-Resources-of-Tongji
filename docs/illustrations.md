# 植物插画与视觉素材

首页插画位于 [`public/illustrations/botanical-garden.png`](../public/illustrations/botanical-garden.png)，由内置 imagegen 工具于 2026-10-21 生成，透明 PNG 原稿，页面使用保留透明通道的 WebP（约 333 KiB）。使用时保留透明通道，通过 CSS 随鼠标轻微摆动和上下漂浮。插画用于首页装饰，植物档案和卡片仍使用项目原有照片。

界面布局参考 [PhoneticToolbox](https://www.phonetictoolbox.com/) 的圆润导航、立体按钮和轻盈卡片。配色调整为叶绿、深绿与白色，少量花瓣粉，不使用黄色界面元素。图标保持 SVG，按钮文字为可访问的 HTML 文本。

## 初始生成提示词

```text
Use case: stylized-concept.
Asset type: transparent botanical illustration for a playful Chinese university plant explorer website.
Primary request: a beautifully crafted soft 3D clay botanical still life, floating like a small collection of treasured objects. A large fresh emerald and jade GREEN ginkgo fan leaf tilted at the upper left, a soft pink magnolia flower at the upper right, and a delicate fern sprig crossing beneath. A blank ivory rounded herbarium specimen card behind the leaves, subtly tilted, with no writing. Arrange as one balanced airy cluster, all objects fully inside the image with generous transparent margin.
Style: premium tactile clay render, softly bevelled forms, believable fine veins, soft studio light and ambient occlusion, relaxed whimsical look like friendly three-dimensional website illustration, high quality.
Color palette: fresh emerald green, deep botanical green, pale jade, magnolia petal pink, tiny wisteria purple accents, neutral ivory. Absolutely NO YELLOW, gold, orange, autumn leaf colors.
Background: genuinely transparent alpha, no ground plane, no frame, shadows only on objects. Landscape-ish square composition for right half of homepage. Objects should remain legible at small display size.
Constraints: no text, no letters, no labels, no logos, no watermark, no hands, no faces, no emoji, no photographs, no UI screenshot. This is decorative artwork, not a botanical scientific plate.
```

## 使用与交互

- `BotanicalHero.vue` 引用插画，并展示可用鼠标、触控和方向键操作的植物标签。
- 漂浮仅改变 `translate` 和 `rotate`，鼠标倾斜使用容器的局部坐标。触控不会触发倾斜。
- 点击右下角暂停按钮可停止首页漂浮，系统设置减少动画时自动停用。
- 不将生成插画加入照片索引，不把插画当作植物鉴定或调查资料。

![首页装饰插画](../public/illustrations/botanical-garden.png)

## 最终配色修订

2026-10-21 通过内置 GPT Image 编辑，将两串紫色花改为白色，将卡纸改为冷白色。页面引用 botanical-garden.webp，PNG 原稿同目录保留。最终编辑提示词见 [hero-edit-prompt.txt](hero-edit-prompt.txt)。

## 文章专属封面

10 篇文章逐篇阅读、分别配图，见[封面画册与设计依据](article-covers.md)以及[完整提示词](article-cover-prompts.json)。
