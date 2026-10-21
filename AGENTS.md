# 素不莳花前端

- Vue 3 + TypeScript + Vite，业务页面位于 `src/views`，公共组件位于 `src/components`，API 适配在 `src/api.ts`。
- `public/legacy` 为原站照片和调查数据，`public/articles` 为文章原文与配图。保持数据、原文、署名不变。
- 植物照片通过 `PlantGallery.vue` 逐张浏览，原始拼图的照片范围在 `src/data/plant-photo-regions.json`，使用 `scripts/index-photo-regions.py` 重建。更新照片后同时检查分隔范围。首页每日物种按北京时间抽样。
- 夜间模式使用石墨灰底色，避免整页墨绿色。外观状态在 `useTheme.ts`，首屏预设在 `index.html`，持久化键为 `tongjiplants_theme`。导航高度由 `--header-height` 统一管理，章节只通过根元素的 `scroll-padding-top` 避让，避免叠加滚动间距。
- 本轮界面采用叶绿、深绿、瓷白，少量花瓣粉，参考 PhoneticToolbox 的圆润导航与立体卡片，不使用黄色主题色，地图默认深色。首页装饰使用 `public/illustrations` 的透明插画，植物档案使用真实照片。全站兼容窄屏、键盘和减少动画偏好。
- 同时支持静态 Hash 路由及动态 History 路由。所有资源通过 `ASSET_BASE`，内部导航通过 Vue Router，兼容子目录部署。
- 验证命令：`npm run build:static`、`npm run build:dynamic`。运行静态预览：`npm run dev -- --mode static --host 127.0.0.1`。
- `output/playwright` 存放浏览器验证和 README 实拍截图，`docs` 存放设计与验证记录。
- 交互改动需实际浏览器验证。地图实例、定时器和事件监听在卸载时清理。
- 不修改 `.env`、密钥和发布工作流，不自动提交、推送或部署。旧 PHP 目录与 backend 不在此次前端改版范围。
