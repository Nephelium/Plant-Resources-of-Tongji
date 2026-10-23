async (page) => {
  const base = page.url().split("#")[0].replace(/\/$/, "") + "/#";
  const checks = [], errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (condition, label) => {
    if (!condition) throw new Error(label);
    checks.push(label);
  };
  const goto = async (path) => {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    await page.locator(".plant-map canvas").waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".page-enter-active,.page-leave-active"),
    );
  };
  const expectTheme = async (theme, label) => {
    await page.waitForFunction((value) => {
      const map = document.querySelector(".plant-map-shell");
      return document.documentElement.dataset.theme === value &&
        map?.classList.contains("map-dark") === (value === "dark");
    }, theme);
    const filter = await page.locator(".leaflet-tile-pane")
      .evaluate((el) => getComputedStyle(el).filter);
    check(theme === "dark" ? filter.includes("invert") : filter === "none", label);
  };
  const select = async (label) => {
    await page.locator(".theme-trigger").click();
    await page.locator(".theme-options")
      .getByRole("button", { name: label, exact: true }).click();
  };
  const scale = () => page.locator(".leaflet-control-scale-line").innerText();
  const wheel = async () => {
    await page.locator(".plant-map").evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }));
    const box = await page.locator(".plant-map").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await scale();
    const y = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, -240);
    await page.waitForFunction((old) =>
      document.querySelector(".leaflet-control-scale-line")?.textContent !== old, before);
    check(Math.abs((await page.evaluate(() => scrollY)) - y) < 2,
      "开启滚轮缩放时改变地图比例，页面保持原位");
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.evaluate(() => localStorage.removeItem("tongjiplants_theme"));
  await goto("/");
  await expectTheme("light", "首次打开，系统日间对应浅色地图");
  await page.waitForFunction(() => [...document.querySelectorAll(".leaflet-tile")]
    .some((img) => img.complete && img.naturalWidth > 0));
  check(true, "真实 OpenStreetMap 图块成功加载");
  check(await page.getByRole("checkbox", { name: "滚轮缩放" }).isChecked(),
    "首页默认开启滚轮缩放");
  await wheel();
  // The same tile element and scale must survive an appearance change.
  const tile = await page.locator(".leaflet-tile-loaded").first().elementHandle();
  const zoomedScale = await scale();
  await select("深色");
  await expectTheme("dark", "手动夜间同步深色地图");
  check((await scale()) === zoomedScale && await tile.evaluate((el) => el.isConnected),
    "切换外观保留缩放与现有图块");
  await page.waitForFunction(() => [...document.querySelectorAll(".leaflet-tile")]
    .every((img) => img.complete && img.naturalWidth > 0));
  await page.locator(".plant-map-shell").screenshot({
    path: "output/playwright/map-theme/dark.png",
  });
  await select("浅色");
  await expectTheme("light", "手动日间同步浅色地图");
  await page.locator(".plant-map-shell").screenshot({
    path: "output/playwright/map-theme/light.png",
  });
  await page.locator(".map-theme-switch").getByRole("button", { name: "深色" }).click();
  check(await page.locator(".plant-map-shell").evaluate((el) => el.classList.contains("map-dark")),
    "仍可单独切换地图底色");
  check(await page.evaluate(() => document.documentElement.dataset.theme === "light"),
    "单独切换地图不改变网站外观");
  await select("深色");
  await select("浅色");
  await expectTheme("light", "网站外观变化后地图恢复跟随");
  await select("跟随系统");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme("dark", "系统切换夜间时地图实时跟随");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".plant-map canvas").waitFor();
  await expectTheme("dark", "夜间刷新后地图初始化为深色");
  await page.emulateMedia({ colorScheme: "light" });
  await expectTheme("light", "系统切回日间时地图实时跟随");
  await page.getByRole("checkbox", { name: "滚轮缩放" }).uncheck();
  const beforeDisabled = await scale();
  await page.locator(".plant-map").evaluate((el) =>
    el.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = await page.locator(".plant-map").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const beforeY = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 180);
  await page.waitForFunction((old) => scrollY > old + 20, beforeY);
  check((await scale()) === beforeDisabled, "关闭滚轮缩放后滚动页面，地图比例不变");
  await page.getByRole("checkbox", { name: "滚轮缩放" }).check();
  await wheel();
  for (const route of ["/taxon?plant=" + encodeURIComponent("银杏"),
    "/plant/" + encodeURIComponent("芭蕉")]) {
    await select("深色");
    await goto(route);
    await expectTheme("dark", route + " 新挂载地图继承当前夜间模式");
    check(await page.getByRole("checkbox", { name: "滚轮缩放" }).isChecked(),
      route + " 默认开启滚轮缩放");
    await wheel();
    await select("浅色");
    await expectTheme("light", route + " 已挂载地图同步日间切换");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await select("深色");
  await expectTheme("dark", "手机尺寸外观按钮可同步切换地图");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    "手机地图无横向溢出");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".plant-map canvas").waitFor();
  await expectTheme("dark", "刷新后地图遵循已保存的手动外观");
  check(errors.length === 0, "未捕获页面异常为 0：" + errors.join("; "));
  return { passed: checks.length, checks };
}
