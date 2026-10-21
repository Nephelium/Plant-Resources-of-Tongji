async (page) => {
  const checks = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
  const shot = async (name, fullPage = false) => {
    await page.waitForFunction(() => {
      const root = document.querySelector('.site-main > section');
      return root && getComputedStyle(root).opacity === '1' && !root.className.includes('page-enter') && !root.className.includes('page-leave');
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: "output/playwright/screenshots/" + name + ".png", fullPage, animations: "disabled" });
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:5173/#/articles");
  await page.locator(".article-card").first().waitFor();
  const covers = await page.locator(".article-cover img").evaluateAll(async images => {
    const originalLoading = images.map(img => img.loading);
    await Promise.all(images.map(async img => { img.loading = "eager"; await img.decode(); }));
    return images.map((img, i) => ({ src: img.src, width: img.naturalWidth, height: img.naturalHeight, originalLoading: originalLoading[i] }));
  });
  check(covers.length === 10 && new Set(covers.map(c => c.src)).size === 10, "10 篇文章分别使用独立封面");
  check(covers.every(c => c.width === 1536 && c.height === 1024), "全部封面解码成功且尺寸正确");
  check(covers.every(c => c.src.endsWith(".webp")), "封面使用优化后的 WebP");
  check(covers.filter(c => c.originalLoading === "eager").length === 2, "仅首批两张封面优先加载");
  check((await page.locator(".featured h2").innerText()).trim() === "樱花樱花想见你", "开篇标题简洁完整");
  await shot("articles-desktop");
  await page.evaluate(() => document.documentElement.style.scrollBehavior = "auto");
  for (const card of await page.locator(".article-card").all()) { await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(120); }
  await page.evaluate(() => scrollTo(0,0));
  await shot("articles-gallery", true);
  await page.getByRole("searchbox", { name: "搜索文章标题" }).fill("读音");
  await page.waitForFunction(() => document.querySelectorAll(".article-card").length === 1);
  check((await page.locator(".article-cover img").getAttribute("src")).includes("sounds.webp"), "标题筛选保持对应封面");
  await page.getByRole("searchbox", { name: "搜索文章标题" }).fill("不存在的手记xyz");
  await page.getByRole("heading", { name: "没有匹配的手记" }).waitFor();
  await page.getByRole("button", { name: "浏览全部手记" }).click();
  check(await page.locator(".article-card").count() === 10, "文章空结果可以恢复");
  await page.locator(".article-card").first().click();
  await page.locator(".reader-cover").waitFor();
  await page.locator(".reader-cover").evaluate(img => img.decode());
  check((await page.locator(".reader-cover").getAttribute("src")).includes("cherry.webp"), "阅读页使用相同专属封面");
  await page.locator(".markdown-body h1").waitFor();
  await shot("reader-desktop");
  await page.goto("http://127.0.0.1:5173/#/bbs");
  await page.locator(".copy-email").waitFor();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.__copiedEmail = text; } } }));
  await page.getByRole("button", { name: "复制邮箱", exact: true }).click();
  check(await page.evaluate(() => window.__copiedEmail === "tongjiplants@163.com"), "复制邮箱内容正确（模拟剪贴板）");
  check((await page.locator(".contact-address [role=status]").innerText()) === "邮箱已复制", "复制成功有可读反馈");
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error("denied"); }; });
  await page.getByRole("button", { name: "复制邮箱", exact: true }).click();
  check((await page.locator(".contact-address [role=status]").innerText()).includes("请选中"), "剪贴板受限时提供手动复制入口");
  await page.reload();
  await page.locator(".qr-frame img").evaluate(img => img.decode());
  await shot("contact-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:5173/#/search");
  await page.getByRole("heading", { name: "发现身边的植物", exact: true }).waitFor();
  await page.locator(".plant-card").first().waitFor();
  await page.waitForTimeout(700);
  const first = await page.locator(".plant-card-image").first().boundingBox();
  check(first.y < 480 && first.y + first.height < 700, "390px 图鉴首屏展示完整植物照片");
  await shot("search-mobile");
  await page.getByRole("combobox", { name: "按科筛选" }).selectOption({ label: "银杏科" });
  await page.waitForFunction(() => document.querySelectorAll(".plant-card").length === 1);
  check((await page.locator(".plant-card h2").innerText()) === "银杏", "手机科筛选可直接使用");
  await page.goto("http://127.0.0.1:5173/#/articles");
  await page.locator(".featured").waitFor();
  await page.locator(".featured img").evaluate(img => img.decode());
  await shot("articles-mobile");
  await page.goto("http://127.0.0.1:5173/#/bbs");
  await page.locator(".contact-copy").waitFor();
  await shot("contact-mobile");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route, selector] of [["articles", ".article-card"], ["bbs", ".contact-copy"], ["search", ".plant-card"]]) {
      await page.goto("http://127.0.0.1:5173/#/" + route);
      await page.locator(selector).first().waitFor();
      await page.waitForTimeout(300);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + "px " + route + " 布局无溢出");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:5173/#/");
  await page.locator(".botanical-art").evaluate(img => img.decode());
  check((await page.locator(".botanical-art").getAttribute("src")).endsWith(".webp"), "首页透明插画使用 WebP");
  await shot("home-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("home-mobile");
  check(errors.length === 0, "封面与联系页回归无页面异常");
  return { checks, covers, errors };
}
