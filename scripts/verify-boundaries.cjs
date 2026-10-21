async (page) => {
  const checks = [],
    pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const check = (condition, name) => {
    if (!condition) throw new Error(name);
    checks.push(name);
  };
  const sub = "http://127.0.0.1:4175/Plant-Resources-of-Tongji/";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(sub + "#/?q=月桂");
  await page.getByRole("textbox", { name: "搜索地图植物" }).waitFor();
  await page.waitForFunction(() =>
    document
      .querySelector(".map-result-count")
      ?.textContent?.includes("1 种 · 1 个点位"),
  );
  await page.waitForTimeout(250);
  const map = page.locator(".plant-map"),
    rect = await map.boundingBox();
  await map.click({ position: { x: rect.width / 2, y: rect.height / 2 } });
  await page.locator(".plant-popup a").click();
  await page.getByRole("heading", { name: "月桂", exact: true }).waitFor();
  check(
    page.url().includes("/Plant-Resources-of-Tongji/#/plant/"),
    "生产构建子目录中的点位详情链接正确",
  );
  await page.reload();
  await page.getByRole("heading", { name: "月桂", exact: true }).waitFor();
  check(
    await page
      .locator(".profile-photo img")
      .evaluate((img) =>
        img.src.includes("/Plant-Resources-of-Tongji/legacy/"),
      ),
    "子目录植物照片地址正确",
  );
  await page.goto(
    sub + "#/articles?article=" + encodeURIComponent("地图纪-樱花樱花想见你"),
  );
  await page.locator(".markdown-body h1").waitFor();
  const photo = page.locator(".markdown-body img").first();
  await photo.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const i = document.querySelector(".markdown-body img");
    return i?.complete && i.naturalWidth > 0;
  });
  check(
    (await photo.getAttribute("src")).includes(
      "/Plant-Resources-of-Tongji/articles/",
    ),
    "子目录文章相对图片加载成功",
  );
  await page.goto(
    sub + "#/articles?article=" + encodeURIComponent("不存在的文章"),
  );
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByRole("alert").innerText()).includes("暂时无法打开"),
    "缺失文章显示可恢复的错误状态",
  );
  await page.route("**/legacy/data/ligneous_plants.geojson.js", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto(sub + "#/");
  await page.reload();
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByRole("alert").innerText()).includes("点位"),
    "数据失败显示重试入口",
  );
  await page.unroute("**/legacy/data/ligneous_plants.geojson.js");
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索地图植物" }).waitFor();
  check(
    (await page.locator(".plant-map canvas").count()) === 1,
    "失败缓存释放后可重试加载地图",
  );
  await page.goto(sub + "#/search?q=" + encodeURIComponent("木犀"));
  await page.locator(".plant-card").first().waitFor();
  check(
    (await page.getByRole("img", { name: "木犀暂无照片" }).count()) === 1,
    "缺失照片使用语义占位",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    sub +
      "#/articles?article=" +
      encodeURIComponent("中国植物志-植物中文正式名的订正"),
  );
  await page.locator(".markdown-body h1").first().waitFor();
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "长篇含原始 HTML 的文章在手机无横向溢出",
  );
  await page.goto("http://127.0.0.1:5173/#/articles");
  await page.getByRole("heading", { name: "草木之间，有故事发生" }).waitFor();
  const sanitization = await page.evaluate(async () => {
    const { renderArticle } = await import("/src/utils/articles.ts");
    const rendered = renderArticle({
      title: "安全验证",
      slug: "test",
      basePath: "/articles/test/",
      markdownPath: "",
      coverImage: "",
      markdown:
        '# 标题\n\n<script>window.__unsafe=1</script><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">链接</a><table><tr><td><em>Latin</em></td></tr></table><span style="color:white;background:#000">White heading</span>',
    });
    return {
      lightText: /color:\s*(white|rgb\(255,\s*255,\s*255\))/i.test(
        rendered.html,
      ),
      unsafe: /<script|onerror|javascript:/i.test(rendered.html),
      em: rendered.html.includes("<em>Latin</em>"),
      toc: rendered.toc.length,
      table: rendered.html.includes("article-table"),
    };
  });
  check(!sanitization.lightText, "移除原背景后白色标题恢复可读颜色");
  check(
    !sanitization.unsafe &&
      sanitization.em &&
      sanitization.toc === 1 &&
      sanitization.table,
    "文章过滤可执行内容并保留学名强调和表格",
  );
  const context = await page
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked storage");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked storage");
    };
  });
  const restricted = await context.newPage();
  const restrictedErrors = [];
  restricted.on("pageerror", (error) => restrictedErrors.push(error.message));
  await restricted.goto(sub + "#/search");
  await restricted.locator(".plant-card").first().waitFor();
  await restricted.getByRole("button", { name: "列表视图" }).click();
  await restricted.goto(
    sub + "#/articles?article=" + encodeURIComponent("地图纪-樱花樱花想见你"),
  );
  await restricted.locator(".markdown-body h1").waitFor();
  await restricted.getByRole("slider", { name: "文章字号" }).fill("20");
  check(restrictedErrors.length === 0, "禁止 localStorage 时图鉴与阅读仍正常");
  await context.close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  let submitted = 0,
    failPost = true;
  const posts = [];
  await page.route("http://127.0.0.1:3010/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/site/profile"))
      return route.fulfill({
        json: {
          title: "素不莳花",
          slogan: "为每一个喜爱植物的你",
          org: "同济大学植物资源网 项目组",
          address: "上海市杨浦区四平路1239号",
          email: "tongjiplants@163.com",
          beian: "",
          beianUrl: "",
        },
      });
    if (path.endsWith("/stats/visit"))
      return route.fulfill({ json: { totalVisits: 1 } });
    if (path.endsWith("/bbs/settings"))
      return route.fulfill({
        json: { pageSize: 5, requireAudit: true, sanitizeHtml: true },
      });
    if (path.endsWith("/bbs/posts") && route.request().method() === "GET")
      return route.fulfill({ json: posts });
    if (path.endsWith("/bbs/posts") && route.request().method() === "POST") {
      submitted++;
      if (failPost)
        return route.fulfill({
          status: 503,
          json: { message: "test failure" },
        });
      const payload = route.request().postDataJSON();
      posts.push({
        ...payload,
        id: 1,
        createdAt: "2026-10-21T00:00:00Z",
        replies: [],
      });
      return route.fulfill({ json: posts[0] });
    }
    return route.fulfill({ status: 404, json: { message: "not found" } });
  });
  await page.goto("http://127.0.0.1:4174/bbs");
  await page.getByRole("heading", { name: "写下你的发现" }).waitFor();
  await page.getByRole("button", { name: "提交留言", exact: true }).click();
  check(submitted === 0, "动态留言必填校验阻止空提交");
  await page.getByLabel("昵称", { exact: true }).fill("本地验证");
  await page
    .getByLabel("邮箱", { exact: true })
    .fill("local-test@example.invalid");
  await page.getByLabel("标题", { exact: true }).fill("本地交互验证");
  await page
    .getByLabel("留言内容", { exact: true })
    .fill("此内容由本地 API 拦截，仅验证表单状态。");
  await page.getByRole("button", { name: "提交留言", exact: true }).click();
  await page.getByRole("alert").waitFor();
  check(
    (await page.getByLabel("留言内容", { exact: true }).inputValue()).includes(
      "本地 API",
    ),
    "模拟提交失败保留留言内容",
  );
  failPost = false;
  await page.getByRole("button", { name: "提交留言", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "留言已提交" }).waitFor();
  check(
    (await page.getByLabel("留言内容", { exact: true }).inputValue()) === "",
    "模拟提交成功清空表单并显示审核状态",
  );
  check(submitted === 2, "动态留言无重复提交");
  await page.unroute("http://127.0.0.1:3010/api/**");
  check(pageErrors.length === 0, "边界检查无未捕获异常");
  return { checks, pageErrors };
}
