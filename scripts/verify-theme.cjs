async (page) => {
  const base = page.url().split("#")[0].replace(/\/$/, "") + "/#";
  const checks = [],
    errors = [];
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  const context = await page
    .context()
    .browser()
    .newContext({
      colorScheme: "dark",
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    });
  const p = await context.newPage();
  p.on("pageerror", (error) => errors.push(error.message));
  const goto = async (path) => {
    await p.goto(base + path);
    await p.locator(".site-main h1").first().waitFor();
    await p.waitForFunction(
      () => !document.querySelector(".page-enter-active,.page-leave-active"),
    );
  };
  const state = () =>
    p.evaluate(() => ({
      mode: document.documentElement.dataset.theme,
      preference: document.documentElement.dataset.themePreference,
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));
  const select = async (label) => {
    await p.locator(".theme-trigger").click();
    await p
      .locator(".theme-options")
      .getByRole("button", { name: label, exact: true })
      .click();
  };
  const screenshot = async (name) => {
    await p.waitForFunction(() => {
      const node = document.querySelector(".site-main > section");
      return node && getComputedStyle(node).opacity === "1";
    });
    await p.screenshot({
      path: "output/playwright/screenshots/" + name + ".png",
      animations: "disabled",
    });
  };
  await goto("/");
  check(
    (await state()).mode === "dark" && (await state()).preference === "system",
    "首次打开随系统进入深色",
  );
  check((await state()).scheme === "dark", "原生表单控件采用深色外观");
  await p.locator(".botanical-art").evaluate((img) => img.decode());
  await screenshot("home-dark");
  await p.emulateMedia({ colorScheme: "light" });
  await p.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  check(true, "系统外观变化实时切换，无需刷新");
  await select("深色");
  check(
    (await state()).mode === "dark" && (await state()).preference === "dark",
    "手动深色覆盖系统浅色",
  );
  await p.reload();
  await p.locator(".theme-trigger").waitFor();
  check((await state()).mode === "dark", "刷新保留手动设置");
  await p.emulateMedia({ colorScheme: "dark" });
  await select("浅色");
  check((await state()).mode === "light", "手动浅色覆盖系统深色");
  await select("跟随系统");
  check((await state()).mode === "dark", "可恢复跟随系统");
  await p.locator(".theme-trigger").focus();
  await p.keyboard.press("Enter");
  check(
    await p
      .locator('.theme-options [aria-pressed="true"]')
      .evaluate((el) => el === document.activeElement),
    "键盘打开外观面板后焦点进入当前选项",
  );
  await p.keyboard.press("Escape");
  check(
    await p
      .locator(".theme-trigger")
      .evaluate((el) => el === document.activeElement),
    "Esc 关闭面板并返回按钮",
  );
  await p.locator(".theme-trigger").click();
  await p.locator(".brand").click();
  check(!(await p.locator(".theme-options").count()), "点击外部关闭面板");

  for (const width of [320, 390, 600, 768, 900, 1000, 1024, 1440, 1920]) {
    await p.setViewportSize({ width, height: 1000 });
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const box = await p.locator(".site-header").boundingBox();
    check(
      box.x === 0 && box.y === 0 && Math.abs(box.width - width) < 2,
      width + "px 顶栏贴顶并铺满窗口",
    );
    const layout = await p.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      children: [...document.querySelectorAll(".header-inner > *")]
        .filter((el) => getComputedStyle(el).display !== "none")
        .map((el) => el.getBoundingClientRect())
        .every((r) => r.left >= 0 && r.right <= innerWidth + 1),
    }));
    check(
      !layout.overflow && layout.children,
      width + "px 顶栏和内容无横向溢出",
    );
    await p.evaluate(() => window.scrollTo({ top: 450, behavior: "instant" }));
    check(
      Math.abs((await p.locator(".site-header").boundingBox()).y) < 1,
      width + "px 滚动后顶栏保持无缝贴顶",
    );
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/search",
    "/taxon?plant=" + encodeURIComponent("银杏"),
    "/plant/" + encodeURIComponent("芭蕉"),
    "/timeline",
    "/articles",
    "/bbs",
    "/admin",
    "/missing-page",
  ]) {
    await goto(route);
    const styles = await p.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      surface: getComputedStyle(document.querySelector(".site-header"))
        .backgroundColor,
      filters: [...document.querySelectorAll("img,.plant-image,svg")].filter(
        (el) => getComputedStyle(el).filter.includes("invert"),
      ),
    }));
    check(
      !styles.overflow &&
        styles.surface === "rgb(34, 36, 40)" &&
        !styles.filters.length,
      route + " 深色页面完整且照片未反色",
    );
  }
  await goto("/taxon?plant=" + encodeURIComponent("银杏"));
  await p.locator(".profile-info").waitFor();
  await p.evaluate(() => window.scrollTo({ top: 450, behavior: "instant" }));
  check(
    (await p.locator(".tree-panel").boundingBox()).y >=
      (await p.locator(".site-header").boundingBox()).height,
    "分类吸顶侧栏处于顶栏下方",
  );
  await screenshot("taxon-dark");
  await goto("/articles");
  const articleLink = await p
    .locator(".article-card")
    .filter({ hasText: "植物中文正式名的订正" })
    .getAttribute("href");
  await goto(articleLink.replace(/^.*#/, ""));
  await p.locator(".markdown-body h1").first().waitFor();
  const toc = p.locator(".article-toc button");
  check((await toc.count()) > 2, "长文保留章节目录");
  await toc.nth(2).click();
  const id = await p
    .locator(".markdown-body h1,.markdown-body h2,.markdown-body h3")
    .nth(2)
    .getAttribute("id");
  const heading = await p.locator("#" + id).boundingBox();
  check(
    heading.y >= (await p.locator(".site-header").boundingBox()).height &&
      heading.y < 180,
    "章节跳转可见且未被顶栏遮住",
  );
  const progress = await p.locator(".reading-progress").boundingBox();
  check(
    Math.abs(
      progress.y - (await p.locator(".site-header").boundingBox()).height,
    ) < 1,
    "阅读进度紧贴顶栏下沿",
  );
  const contrast = await p.evaluate(() => {
    const lum = (rgb) => {
      const c = rgb
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((x) => {
          x /= 255;
          return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const bg = lum(
      getComputedStyle(document.querySelector(".reader-paper")).backgroundColor,
    );
    return [
      ...document.querySelectorAll(
        '.markdown-body [style*="--article-dark-color"]',
      ),
    ].map((el) => (lum(getComputedStyle(el).color) + 0.05) / (bg + 0.05));
  });
  check(
    contrast.length > 0 && Math.min(...contrast) >= 4.5,
    "原文章彩色强调在深色纸面上达到 4.5 对比度",
  );
  await screenshot("reader-dark");
  await goto("/search");
  await p.locator(".plant-card").first().waitFor();
  await screenshot("search-dark");
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator(".theme-trigger").click();
  const panel = await p.locator(".theme-options").boundingBox();
  check(panel.x >= 0 && panel.x + panel.width <= 390, "手机外观面板完整显示");
  await screenshot("theme-mobile");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "展开导航" }).click();
  const nav = await p.locator("#main-nav").boundingBox();
  check(
    nav.y >= (await p.locator(".site-header").boundingBox()).height - 1,
    "手机导航位于顶栏下方",
  );
  await p.getByRole("button", { name: "收起导航" }).click();
  await select("浅色");
  await goto("/");
  await p.locator(".botanical-art").evaluate((img) => img.decode());
  await p.setViewportSize({ width: 1440, height: 1000 });
  await screenshot("home-desktop");
  await p.setViewportSize({ width: 390, height: 844 });
  await screenshot("home-mobile");
  await p.locator(".theme-trigger").click();
  await p.keyboard.press("Tab");
  await p.keyboard.press("Tab");
  await p.keyboard.press("Tab");
  check(
    !(await p.locator(".theme-options").count()),
    "Tab 离开外观面板自动收起",
  );

  const restricted = await page
    .context()
    .browser()
    .newContext({ colorScheme: "dark" });
  await restricted.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const r = await restricted.newPage();
  r.on("pageerror", (error) => errors.push(error.message));
  await r.goto(base + "/search");
  await r.locator(".theme-trigger").waitFor();
  check(
    await r.evaluate(() => document.documentElement.dataset.theme === "dark"),
    "禁止存储时仍跟随系统",
  );
  await r.locator(".theme-trigger").click();
  await r
    .locator(".theme-options")
    .getByRole("button", { name: "浅色", exact: true })
    .click();
  check(
    await r.evaluate(() => document.documentElement.dataset.theme === "light"),
    "禁止存储时仍可手动切换",
  );
  await restricted.close();
  check(errors.length === 0, "页面未捕获异常为零");
  await context.close();
  return { base, checks, errors };
}
