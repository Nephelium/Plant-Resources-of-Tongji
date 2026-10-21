async (page) => {
  const checks = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:5173/#";
  const check = (ok, name) => {
    if (!ok) throw new Error(name);
    checks.push(name);
  };
  const ready = async (selector) => {
    await page.locator(selector).first().waitFor();
    await page.waitForFunction(() => {
      const r = document.querySelector(".site-main>section");
      return (
        r &&
        getComputedStyle(r).opacity === "1" &&
        !r.className.includes("page-")
      );
    });
  };
  const shot = async (name) => {
    await page.waitForTimeout(650);
    await page.screenshot({
      path: "output/playwright/screenshots/" + name + ".png",
      animations: "disabled",
    });
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/taxon?plant=" + encodeURIComponent("芭蕉"));
  await ready(".profile-photo .gallery-slide");
  const gallery = page.locator(".profile-photo .plant-gallery");
  check(
    (await gallery.getAttribute("data-photo-count")) === "2",
    "芭蕉两张照片独立显示",
  );
  const region = await gallery.locator("svg").first().getAttribute("viewBox");
  check(Number(region.split(" ")[3]) < 3000, "页面视窗只显示单张照片范围");
  const imageLoaded = await gallery
    .locator(".photo-source")
    .first()
    .evaluate(
      (el) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth === 1640);
          img.onerror = () => resolve(false);
          img.src = el.getAttribute("href") || el.getAttribute("src");
        }),
    );
  check(imageLoaded, "图库仍加载原始实拍照片");
  await shot("gallery-taxon-desktop");
  await page
    .getByRole("button", { name: "芭蕉下一张照片", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "1",
  );
  check(
    await page
      .getByRole("button", { name: "芭蕉下一张照片", exact: true })
      .isDisabled(),
    "到末张时下一张禁用",
  );
  await page
    .getByRole("button", { name: "查看芭蕉第1张", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "0",
  );
  const track = gallery.locator(".gallery-track");
  await track.focus();
  await page.keyboard.press("End");
  await page.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "1",
  );
  await page.keyboard.press("Home");
  await page.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "0",
  );
  check(true, "嵌入图库支持方向键和 Home/End");
  const rect = await track.boundingBox();
  await page.mouse.move(rect.x + rect.width * 0.85, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.1, rect.y + rect.height * 0.5, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "1",
  );
  check(
    (await page.getByRole("dialog").count()) === 0,
    "鼠标拖动换片不会误打开大图",
  );
  await page.waitForTimeout(300);
  await page
    .getByRole("button", { name: "放大查看芭蕉第2张照片", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  check(
    await page
      .locator(".lightbox-toolbar")
      .innerText()
      .then((t) => t.includes("2 / 2")),
    "打开大图保留当前照片",
  );
  check(
    (await page.evaluate(() => document.body.style.overflow)) === "hidden",
    "大图打开时锁定背景滚动",
  );
  await page.getByRole("button", { name: "大图下一张", exact: true }).click();
  check(
    (await page.locator(".lightbox-toolbar").innerText()).includes("1 / 2"),
    "大图可循环切换照片",
  );
  await page.keyboard.press("ArrowRight");
  check(
    (await page.locator(".lightbox-toolbar").innerText()).includes("2 / 2"),
    "大图支持方向键切换",
  );
  await shot("gallery-lightbox");
  await page.getByRole("button", { name: "放大照片细节", exact: true }).click();
  check(
    await page
      .locator(".lightbox-scroll")
      .evaluate(
        (el) =>
          el.scrollWidth > el.clientWidth * 1.9 &&
          el.scrollHeight > el.clientHeight * 1.9,
      ),
    "放大后可滚动查看照片细节",
  );
  await page.keyboard.press("Escape");
  check(
    (await page.getByRole("dialog").count()) === 0 &&
      (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "Esc 关闭大图并恢复页面滚动",
  );
  check(
    await page
      .getByRole("button", { name: "放大查看芭蕉第2张照片", exact: true })
      .evaluate((el) => document.activeElement === el),
    "关闭大图后焦点返回照片按钮",
  );
  await page.goto(base + "/taxon?plant=" + encodeURIComponent("水杉"));
  await ready(".profile-photo .plant-gallery");
  check(
    (await page
      .locator(".profile-photo .plant-gallery")
      .getAttribute("data-photo-count")) === "3" &&
      (await page
        .locator(".profile-photo .plant-gallery")
        .getAttribute("data-photo-index")) === "0",
    "切换植物重置图库，水杉显示三张照片",
  );
  await page.goto(base + "/search?q=" + encodeURIComponent("八角金盘"));
  await ready(".plant-card .plant-gallery");
  check(
    (await page
      .locator(".plant-card .plant-gallery")
      .getAttribute("data-photo-count")) === "2",
    "检索卡片也按单张照片显示",
  );
  await page
    .getByRole("button", { name: "放大查看八角金盘第1张照片", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.evaluate(
    () => (location.hash = "#/taxon?plant=" + encodeURIComponent("玉兰")),
  );
  await ready(".profile-photo .plant-gallery");
  check(
    (await page.getByRole("dialog").count()) === 0 &&
      (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "大图打开时离开页面也能清理对话框和滚动锁",
  );
  check(
    (await page
      .locator(".profile-photo .plant-gallery")
      .getAttribute("data-photo-count")) === "5",
    "玉兰五张照片分别可浏览",
  );
  await page.goto(base + "/");
  await ready(".quick-plants button");
  const daily = await page.locator(".quick-plants button").allTextContents();
  check(
    daily.length === 3 && new Set(daily).size === 3,
    "今日遇见选出三个不同的真实物种",
  );
  const hero = await page.getByRole("tab").allTextContents();
  check(daily.join() === hero.join(), "首页植物卡片与今日物种一致");
  const before = await page.locator(".discovery-title h3").allTextContents();
  check(
    before.length === 4 &&
      new Set(before).size === 4 &&
      before.every((n) => !daily.includes(n)),
    "相识卡片随机选四种，避开今日物种",
  );
  await page.getByRole("button", { name: "换一组", exact: true }).click();
  const after = await page.locator(".discovery-title h3").allTextContents();
  check(
    after.length === 4 && after.every((n) => !before.includes(n)),
    "换一组得到另一组物种",
  );
  await page.reload();
  await ready(".quick-plants button");
  check(
    (await page.locator(".quick-plants button").allTextContents()).join() ===
      daily.join(),
    "每日随机物种当天刷新保持一致",
  );
  await page.locator(".discovery-grid").scrollIntoViewIfNeeded();
  await shot("discovery-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/plant/" + encodeURIComponent("芭蕉"));
  await ready(".profile-photo .plant-gallery");
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "手机档案图库无横向页面溢出",
  );
  await shot("gallery-mobile");
  const browser = page.context().browser();
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await touchContext.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base + "/plant/" + encodeURIComponent("芭蕉"));
  await mobile.locator(".gallery-track").scrollIntoViewIfNeeded();
  const tr = await mobile.locator(".gallery-track").boundingBox();
  const cdp = await touchContext.newCDPSession(mobile);
  const swipe = async (r, reverse = false) => {
    const x1 = r.x + r.width * (reverse ? 0.18 : 0.84),
      x2 = r.x + r.width * (reverse ? 0.84 : 0.18),
      y = r.y + r.height * 0.48;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: x1, y }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x1 + ((x2 - x1) * i) / 8, y }],
      });
      await mobile.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  await swipe(tr);
  await mobile.waitForFunction(
    () =>
      document.querySelector(".profile-photo .plant-gallery").dataset
        .photoIndex === "1",
  );
  check(true, "真实触摸事件可滑动嵌入图库");
  await mobile
    .getByRole("button", { name: "放大查看芭蕉第2张照片", exact: true })
    .tap();
  await mobile.getByRole("dialog").waitFor();
  const lr = await mobile.locator(".lightbox-scroll").boundingBox();
  await swipe(lr, true);
  await mobile.waitForFunction(() =>
    document.querySelector(".lightbox-toolbar").textContent.includes("1 / 2"),
  );
  check(true, "手机大图也支持触摸滑动切换");
  await mobile.getByRole("button", { name: "关闭照片查看器" }).tap();
  await touchContext.close();
  check(errors.length === 0, "图库和随机展示没有未捕获异常");
  return { checks, errors, daily, before, after };
}
