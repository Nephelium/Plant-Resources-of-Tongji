async (page) => {
  const checks = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  const check = (condition, name) => {
    if (!condition) throw new Error(name);
    checks.push(name);
  };
  const base = "http://127.0.0.1:5173/#";
  const screenshot = async (name) => {
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
    });
    // Let finite reveal transitions finish before documenting the rendered page.
    await page.waitForTimeout(850);
    await page.screenshot({
      path: "output/playwright/screenshots/" + name + ".png",
      fullPage: false,
      animations: "disabled",
    });
  };
  const goto = async (path) => {
    await page.goto(base + path);
    const title =
      path === "/"
        ? "植物地图"
        : path === "/search"
          ? "植物检索"
          : path === "/taxon"
            ? "分类系统"
            : path.startsWith("/plant/")
              ? decodeURIComponent(path.split("/").pop())
              : path === "/articles"
                ? "文章精选"
                : path === "/timeline"
                  ? "植物变迁"
                  : path === "/bbs"
                    ? "留言板"
                    : path === "/admin"
                      ? "网站管理"
                      : "页面未找到";
    await page.waitForFunction(
      (expected) => document.title === expected + " · 素不莳花",
      title,
    );
    // The route title updates before Vue's outgoing page transition finishes.
    await page.waitForFunction(
      () => !document.querySelector(".page-enter-active, .page-leave-active"),
    );
    await page.locator(".site-main h1").first().waitFor();
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto("/");
  await page.getByRole("textbox", { name: "搜索地图植物" }).waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".stats-strip")?.textContent?.includes("15,937"),
  );
  check(
    (await page.locator(".stats-strip").innerText()).includes("141"),
    "首页统计排除空名称，保留全部点位",
  );
  check(
    (await page.locator(".plant-map canvas").count()) === 1,
    "15,937 个点位使用 Canvas",
  );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".leaflet-tile")].some(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  check((await page.locator(".map-dark").count()) === 1, "默认深色底图");
  await page.locator(".botanical-art").evaluate((img) => img.decode());
  await page.getByRole("tab", { name: "认识玉兰" }).click();
  await page.getByRole("link", { name: "打开玉兰植物档案" }).waitFor();
  check(
    (await page
      .getByRole("tab", { name: "认识玉兰" })
      .getAttribute("aria-selected")) === "true",
    "首页植物卡片可点选",
  );
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("link", { name: "打开水杉植物档案" }).waitFor();
  check(
    await page
      .getByRole("tab", { name: "认识水杉" })
      .evaluate((el) => el === document.activeElement),
    "首页植物卡片支持方向键与焦点移动",
  );
  await page.getByRole("button", { name: "暂停首页漂浮动效" }).click();
  check(
    (await page
      .locator(".botanical-art")
      .evaluate((el) => getComputedStyle(el).animationPlayState)) === "paused",
    "漂浮插画可以暂停",
  );
  await page.getByRole("button", { name: "开启首页漂浮动效" }).click();
  const sceneRect = await page.locator(".botanical-scene").boundingBox();
  await page.mouse.move(
    sceneRect.x + sceneRect.width * 0.8,
    sceneRect.y + sceneRect.height * 0.3,
  );
  check(
    await page
      .locator(".botanical-scene")
      .evaluate((el) => el.style.getPropertyValue("--tilt-y") !== "0deg"),
    "插画随鼠标轻微摆动",
  );
  await page.mouse.move(0, 0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    (await page
      .locator(".botanical-art")
      .evaluate((el) => getComputedStyle(el).animationName)) === "none",
    "减少动画偏好停用装饰动画",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("tab", { name: "认识银杏" }).click();
  await page.getByRole("link", { name: "打开银杏植物档案" }).waitFor();
  await screenshot("home-desktop");
  await page.getByRole("link", { name: "沿着地图，遇见植物" }).click();
  await page.waitForFunction(() => scrollY > 400);
  check(page.url().endsWith("#/"), "页内地图入口不破坏 Hash 路由");
  await screenshot("map-desktop");
  await page.getByRole("button", { name: "标准", exact: true }).click();
  check((await page.locator(".map-dark").count()) === 0, "切换标准底图");
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "展开地图", exact: true }).click();
  check(
    (await page.getByRole("dialog").count()) === 1,
    "展开地图形成可聚焦对话区域",
  );
  await page.keyboard.press("Escape");
  check((await page.getByRole("dialog").count()) === 0, "Esc 收起地图");
  check(
    (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "收起地图恢复页面滚动",
  );
  await page.getByRole("textbox", { name: "搜索地图植物" }).fill("月桂");
  await page.waitForFunction(() =>
    document
      .querySelector(".map-result-count")
      ?.textContent?.includes("1 种 · 1 个点位"),
  );
  await page.waitForTimeout(250);
  const canvas = page.locator(".plant-map");
  const rect = await canvas.boundingBox();
  await canvas.click({ position: { x: rect.width / 2, y: rect.height / 2 } });
  await page.locator(".plant-popup a").waitFor();
  check(
    (await page.locator(".plant-popup a").getAttribute("href")).startsWith(
      "#/plant/",
    ),
    "地图弹窗使用静态路由链接",
  );
  await page.locator(".plant-popup a").click();
  await page.getByRole("heading", { name: "月桂", exact: true }).waitFor();
  check(page.url().includes("/plant/"), "地图点位可打开植物详情");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索地图植物" }).waitFor();
  check(
    (await page.getByRole("textbox", { name: "搜索地图植物" }).inputValue()) ===
      "月桂",
    "详情返回保留地图筛选",
  );
  await page
    .getByRole("textbox", { name: "搜索地图植物" })
    .fill("不存在的植物xyz");
  await page.getByRole("heading", { name: "还没找到这株植物" }).waitFor();
  await page.getByRole("button", { name: "查看全部植物", exact: true }).click();
  check(
    (await page.getByRole("textbox", { name: "搜索地图植物" }).inputValue()) ===
      "",
    "地图空结果可恢复",
  );
  await goto("/search");
  await page.locator(".plant-card").first().waitFor();
  check(
    (await page.locator(".plant-card").count()) === 24,
    "图鉴首次展示 24 张分页卡片",
  );
  await screenshot("search-desktop");
  await page
    .getByRole("searchbox", { name: "检索植物", exact: true })
    .fill("ginkgo");
  await page.waitForFunction(
    () => document.querySelectorAll(".plant-card").length === 1,
  );
  check(
    (await page.locator(".plant-card h2").innerText()) === "银杏",
    "学名大小写检索有效",
  );
  await page.getByRole("button", { name: "列表视图" }).click();
  check((await page.locator(".catalog-list").count()) === 1, "图鉴列表切换");
  await page.getByRole("link", { name: "查看银杏", exact: true }).click();
  await page.getByRole("heading", { name: "银杏", exact: true }).waitFor();
  await screenshot("plant-desktop");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "检索植物", exact: true })
    .waitFor();
  check(
    (await page
      .getByRole("searchbox", { name: "检索植物", exact: true })
      .inputValue()) === "ginkgo",
    "详情返回保留图鉴搜索",
  );
  await page
    .getByRole("searchbox", { name: "检索植物", exact: true })
    .fill("not-a-plant");
  await page.getByRole("heading", { name: "还没有找到匹配的植物" }).waitFor();
  await page.getByRole("button", { name: "浏览全部植物", exact: true }).click();
  await page.getByRole("button", { name: "卡片视图" }).click();
  await page.getByRole("button", { name: "第2页", exact: true }).click();
  check(page.url().includes("page=2"), "图鉴分页写入链接");
  await page.reload();
  await page.locator(".plant-card").first().waitFor();
  check(
    (await page
      .getByRole("button", { name: "第2页", exact: true })
      .getAttribute("aria-current")) === "page",
    "刷新保留图鉴页码",
  );
  await goto("/taxon");
  await page.getByRole("textbox", { name: "筛选分类目录" }).fill("银杏");
  await page.getByRole("button", { name: "银杏", exact: true }).click();
  await page.getByRole("heading", { name: "银杏", exact: true }).waitFor();
  check(
    (await page
      .getByRole("button", { name: "银杏", exact: true })
      .getAttribute("aria-pressed")) === "true",
    "分类树标记所选植物",
  );
  await screenshot("taxon-desktop");
  await page.getByRole("textbox", { name: "筛选分类目录" }).fill("水杉");
  await page.getByRole("button", { name: "水杉", exact: true }).click();
  await page.getByRole("heading", { name: "水杉", exact: true }).waitFor();
  check(
    (await page.locator(".plant-map canvas").count()) === 1,
    "分类切换后地图实例正常",
  );
  await goto("/articles");
  await page.locator(".article-card").first().waitFor();
  check(
    (await page.locator(".article-card").count()) === 10,
    "文章目录显示 10 篇原有文章",
  );
  await screenshot("articles-desktop");
  await page.getByRole("button", { name: "校园手记", exact: true }).click();
  check((await page.locator(".article-card").count()) === 6, "文章主题筛选");
  await page.getByRole("link").filter({ hasText: "樱花樱花想见你" }).click();
  await page.locator(".markdown-body h1").first().waitFor();
  await screenshot("reader-desktop");
  await page.getByRole("slider", { name: "文章字号" }).fill("21");
  await page.getByRole("slider", { name: "文章行距" }).fill("2.1");
  await page.reload();
  await page.locator(".markdown-body h1").waitFor();
  check(
    (await page.getByRole("slider", { name: "文章字号" }).inputValue()) ===
      "21",
    "阅读字号刷新后保留",
  );
  check(
    (await page.getByRole("slider", { name: "文章行距" }).inputValue()) ===
      "2.1",
    "阅读行距刷新后保留",
  );
  await page.getByRole("button", { name: "恢复默认", exact: true }).click();
  await goto("/timeline");
  await page.locator(".year-group").first().waitFor();
  check(
    (await page.locator(".year-group li").count()) === 9,
    "植物变迁保留 9 条原始记录",
  );
  await page.getByRole("button", { name: "2017 年", exact: true }).click();
  check((await page.locator(".year-group").count()) === 1, "按年份筛选变迁");
  await page.getByRole("button", { name: "全部年份" }).click();
  await screenshot("timeline-desktop");
  await goto("/bbs");
  check(
    (await page.getByRole("button", { name: "提交留言" }).count()) === 0,
    "静态站不显示不可用的留言表单",
  );
  check(
    (
      await page
        .getByRole("link", { name: "写一封草木来信" })
        .getAttribute("href")
    ).startsWith("mailto:"),
    "留言页提供邮件入口",
  );
  await screenshot("contact-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/");
  await page.getByRole("textbox", { name: "搜索地图植物" }).waitFor();
  await screenshot("home-mobile");
  await page.getByRole("button", { name: "展开导航", exact: true }).click();
  check(
    await page.getByRole("link", { name: "植物检索", exact: true }).isVisible(),
    "手机导航可展开",
  );
  await page.keyboard.press("Escape");
  check(
    !(await page
      .getByRole("link", { name: "植物检索", exact: true })
      .isVisible()),
    "Esc 收起手机导航",
  );
  await page.getByRole("button", { name: "展开导航", exact: true }).click();
  await page.getByRole("link", { name: "植物检索", exact: true }).click();
  await page.locator(".plant-card").first().waitFor();
  check(
    (await page
      .getByRole("button", { name: "展开导航", exact: true })
      .getAttribute("aria-expanded")) === "false",
    "导航后自动收起手机菜单",
  );
  await screenshot("search-mobile");
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of [
      "/",
      "/search",
      "/taxon",
      "/plant/银杏",
      "/articles",
      "/timeline",
      "/bbs",
      "/admin",
    ]) {
      await goto(path);
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      check(!overflow, width + "px " + path + " 无横向溢出");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto("/does-not-exist");
  await page.getByRole("heading", { name: "这页还没有生长出来" }).waitFor();
  check(
    await page.getByRole("heading", { name: "这页还没有生长出来" }).isVisible(),
    "未知路由有返回入口",
  );
  check(pageErrors.length === 0, "浏览器无未捕获页面异常");
  check(consoleErrors.length === 0, "浏览器无控制台错误");
  return { checks, pageErrors, consoleErrors };
}
