# 本地验证记录

日期：2026-10-21。环境：Windows、Node.js 24.13.0、Chrome，使用 Playwright CLI 操作实际浏览器。截图来自本地运行的页面。

## 构建

| 检查 | 结果 |
| --- | --- |
| `npm run build:static` | 通过，包含 `vue-tsc -b` |
| `npm run build:dynamic -- --outDir dist-dynamic` | 通过，包含 `vue-tsc -b` |
| `VITE_APP_BASE=/Plant-Resources-of-Tongji/` 的静态构建 | 通过，产物位于 `dist-subpath` |
| `git diff --check` | 通过 |

## 浏览器覆盖

主流程脚本：[`scripts/verify-browser.cjs`](../scripts/verify-browser.cjs)。静态开发服务使用 `http://127.0.0.1:5173/`。

- 首页：141 个非空植物名称、15,937 个调查点位，插画及照片正常加载。植物标签点选、方向键切换及焦点移动，鼠标摆动、暂停、系统减少动画。
- 地图：默认深色与标准切换、单株点位弹窗、进入档案与返回、筛选、空结果恢复、展开与 Esc、页面滚动恢复。
- 图鉴：默认 24 张卡片、学名检索、卡片与列表、档案返回保留查询、分页和刷新后的页码。
- 分类：目录筛选、选择反馈、连续切换植物、地图实例正常清理与重建。
- 文章：10 篇原有文章、主题筛选、进入原文、字号与行距保存、恢复默认。
- 变迁：9 条原始记录、年份筛选。
- 联系：静态站邮件入口、移动导航开关和 Esc、未知路由的返回入口。
- 布局：320 / 390 / 768 / 1024 px × 地图、图鉴、分类、档案、文章、变迁、留言、管理共 32 种组合。首页额外核对 650 / 850 / 900 / 1440 px。

主流程 71 项检查通过，未捕获页面异常与正常浏览控制台错误均为 0。

封面与新版页面专项脚本：[`scripts/verify-covers.cjs`](../scripts/verify-covers.cjs)，24 项检查通过。

- 10 篇文章各有独立 WebP 封面，全部可解码为 1536 × 1024，首批两张优先加载。
- 文章标题筛选、空结果恢复、阅读页封面一致性。
- 使用模拟剪贴板验证复制的准确内容、成功反馈和权限受限后的手动复制提示，不修改用户剪贴板。
- 390 px 图鉴首屏能完整看到第一排植物照片，科筛选可用。
- 320 / 390 / 768 px 下的文章、联系、检索共 9 种布局无横向溢出。
- 首页透明 WebP 正常加载，无未捕获页面异常。

额外检查了手机联系页过渡结束后内容可见，以及子目录生产构建的全部 10 张封面和阅读页封面加载。逐张查看截图时修正了联系页截图的捕获时机，截图等待根元素恢复完全可见。

边界脚本：[`scripts/verify-boundaries.cjs`](../scripts/verify-boundaries.cjs)，16 项检查通过，未捕获页面异常为 0。

- 子目录生产构建中的点位详情、直接刷新、植物照片和文章相对图片。
- 模拟点位资源返回 503，恢复网络响应后可通过页面按钮重试。
- 缺失文章的错误页、缺照片的语义占位、长篇原始 HTML 在手机阅读时无横向溢出。
- 文章过滤脚本与事件属性，保留学名强调和表格。原有白色标题去除背景后恢复可读颜色。
- localStorage 被浏览器禁止时，图鉴和阅读设置仍能在当前页面操作。
- 动态留言的必填校验、503 失败时保留输入、成功时清空表单并显示审核状态、防重复提交。

动态留言使用 Playwright 拦截的本地模拟 API，没有向实际后端或线上站点发送留言。该场景中刻意制造的 503 会产生预期网络错误，不计作正常浏览场景的成功请求。

## 复现边界检查

保持静态开发服务运行。分别在两个终端构建并启动预览：

```powershell
$env:VITE_APP_BASE = '/Plant-Resources-of-Tongji/'
npm run build:static -- --outDir dist-subpath
npm run preview -- --outDir dist-subpath --host 127.0.0.1 --port 4175
```

```powershell
$env:VITE_APP_BASE = '/'
$env:VITE_API_BASE_URL = 'http://127.0.0.1:3010/api'
npm run build:dynamic -- --outDir dist-dynamic
npm run preview -- --outDir dist-dynamic --host 127.0.0.1 --port 4174
```

另一个终端运行：

```powershell
npx --yes --package @playwright/cli playwright-cli -s=tongji-boundaries open http://127.0.0.1:5173/
npx --yes --package @playwright/cli playwright-cli -s=tongji-boundaries run-code --filename=scripts/verify-boundaries.cjs
```

这两个脚本是 Playwright CLI 的函数表达式，使用 `run-code --filename` 执行。文件末尾不加分号。

## 截图

[`output/playwright/screenshots`](../output/playwright/screenshots/) 包含首页、地图、图鉴、档案、分类、文章目录、文章阅读、变迁、联系共 9 张桌面截图，首页、图鉴、文章和联系 4 张手机尺寸截图，以及 1 张完整文章目录长图。README 中的 13 张内嵌截图与 1 个长图链接均已检查存在。

## 验证范围

上述记录覆盖本地前端及生产构建预览。真实后端的管理员登录、审核与持久化未在本轮接入测试。手机尺寸通过浏览器模拟，未在实体手机、Safari 或 Firefox 上验证。公开版本通过仓库现有 GitHub Pages 工作流发布，上线状态以对应提交的 Actions 结果与线上页面复核为准。
