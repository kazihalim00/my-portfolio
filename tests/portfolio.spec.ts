import { test, expect, type Page } from "@playwright/test";

async function openLabTab(page: Page, name: "Bug Hunt" | "Test Runner" | "Terminal") {
  await page.locator("#lab").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name }).click();
}

test.describe("portfolio", () => {
  test("loads with name, CTA and no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kazi Abdul Halim Sunny/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kazi Abdul Halim Sunny");
    await expect(page.getByRole("link", { name: "See projects" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("CV files are downloadable", async ({ request }) => {
    for (const path of ["/cv/Kazi_Sunny_CV_Developer.pdf"]) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("pdf");
    }
  });

  test("theme toggle persists across reloads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("project filter narrows the list", async ({ page }) => {
    await page.goto("/");
    const projects = page.locator("#projects");
    await projects.getByRole("tab", { name: "Python" }).click();
    await expect(projects.getByRole("heading", { name: "Noor-AI", exact: true })).toBeVisible();
    await expect(projects.getByRole("heading", { name: "House Rent Management System" })).toHaveCount(0);
  });
});

test.describe("command palette", () => {
  test("Ctrl+K opens it and runs a navigation command", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut is desktop only");
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.getByLabel("Search commands").fill("terminal");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("tab", { name: "Terminal" })).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("terminal", () => {
  test("runs commands and reports unknown ones", async ({ page }) => {
    await page.goto("/");
    await openLabTab(page, "Terminal");
    const input = page.getByLabel("Terminal command");
    await input.fill("whoami");
    await input.press("Enter");
    await expect(page.locator("#panel-terminal")).toContainText("Kazi Abdul Halim Sunny");
    await input.fill("foobar");
    await input.press("Enter");
    await expect(page.locator("#panel-terminal")).toContainText("command not found: foobar");
  });
});

test.describe("bug hunt", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openLabTab(page, "Bug Hunt");
  });

  const tracker = (page: Page) => page.locator("#panel-hunt");

  test("finds behavioural bugs: negative qty, stacked coupon, wrong remove", async ({ page }) => {
    const panel = tracker(page);
    await page.getByLabel("Quantity for USB-C Hub").fill("-2");
    await panel.getByPlaceholder("Coupon code").fill("SAVE10");
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.getByRole("button", { name: "Remove Mechanical Keyboard" }).click();
    await expect(panel).toContainText("Quantity accepts negative numbers");
    await expect(panel).toContainText("Coupon can be applied more than once");
    await expect(panel).toContainText("Remove deletes the wrong item");
  });

  test("finds checkout bugs: invalid email and double submit", async ({ page }) => {
    const panel = tracker(page);
    await panel.getByPlaceholder("Full name *").fill("Recruiter");
    await panel.getByPlaceholder("Email *").fill("abc");
    const placeOrder = panel.getByRole("button", { name: /Place order|Processing/ });
    await placeOrder.click();
    await placeOrder.click(); // second click while the first order is still processing
    await expect(panel).toContainText("Invalid email is accepted");
    await expect(panel).toContainText("Double click places two orders");
  });

  test("report mode: real bug scores, false report costs points", async ({ page }) => {
    const panel = tracker(page);
    await panel.getByRole("button", { name: "Report mode" }).click();
    await panel.getByText("Totla").click();
    await expect(panel).toContainText("Typo in the order summary");
    await panel.getByRole("button", { name: "Report mode" }).click();
    await panel.getByText("Subtotal").click();
    await expect(page.getByText("Not a bug")).toBeVisible();
  });

  test("finding every bug ends the game and offers the leaderboard", async ({ page }) => {
    const panel = tracker(page);
    // Visual bugs first: free shipping only applies while the subtotal is above $50.
    for (const target of ["$19.00", "Shipping", "Totla"]) {
      await panel.getByRole("button", { name: "Report mode" }).click();
      await panel.getByText(target, { exact: true }).first().click();
    }
    await page.getByLabel("Quantity for USB-C Hub").fill("-1");
    await panel.getByPlaceholder("Coupon code").fill("save10");
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.getByRole("button", { name: "Apply" }).click();
    await panel.getByPlaceholder("Full name *").fill("QA");
    await panel.getByPlaceholder("Email *").fill("nope");
    const placeOrder = panel.getByRole("button", { name: /Place order|Processing/ });
    await placeOrder.click();
    await placeOrder.click();
    await panel.getByRole("button", { name: "Remove Mechanical Keyboard" }).click();
    await expect(panel.getByText("8/8").first()).toBeVisible();
    await expect(panel.getByPlaceholder("Your name")).toBeVisible();
  });
});

test.describe("test runner", () => {
  test("shows failures, then all green after shipping fixes", async ({ page }) => {
    await page.goto("/");
    await openLabTab(page, "Test Runner");
    const panel = page.locator("#panel-tests");
    await panel.getByRole("button", { name: "Run tests" }).click();
    await expect(panel).toContainText("24 failed", { timeout: 15_000 });
    await panel.getByText("Ship all fixes").click();
    await panel.getByRole("button", { name: "Run again" }).click();
    await expect(panel).toContainText("All green", { timeout: 15_000 });
  });
});

test.describe("contact", () => {
  test("validates fields before sending", async ({ page }) => {
    await page.goto("/");
    const form = page.locator("#contact");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form).toContainText("Please enter your name");
    await expect(form).toContainText("Enter a valid email");
    await form.getByLabel("Email", { exact: true }).fill("abc");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form).toContainText("Enter a valid email");
  });
});

test.describe("guestbook", () => {
  test("signing adds a note to the wall", async ({ page }) => {
    await page.goto("/");
    const gb = page.locator("#guestbook");
    await gb.getByLabel("Name").fill("Playwright Bot");
    await gb.getByLabel("Message").fill("Automated hello from CI");
    await gb.getByRole("button", { name: "Sign" }).click();
    await expect(gb).toContainText("Automated hello from CI");
  });
});

test.describe("books", () => {
  test("free book opens as a paginated book and remembers the place", async ({ page }) => {
    await page.goto("/");
    await page.locator("#books").getByRole("link", { name: "Read free" }).first().click();
    await expect(page).toHaveURL(/\/read\/paper-addopanto/);
    const book = page.locator("[data-reader-ready]");
    await expect(book).toBeVisible({ timeout: 15_000 });
    await expect(book).toHaveAttribute("data-page", "1");
    await expect(book.getByRole("img", { name: /cover/ })).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).last().click();
    await expect(book).not.toHaveAttribute("data-page", "1");
    await page.getByRole("button", { name: "Contents" }).click();
    await page.getByRole("dialog", { name: "Table of contents" }).getByRole("button").nth(4).click();
    // The 3D page faces confuse IntersectionObserver, so check the heading's box against the window instead.
    const heading = book.locator(".bk-h1, .bk-h2").filter({ hasText: /লেখকের কথা/, visible: true }).first();
    await expect(heading).toBeVisible();
    await expect.poll(async () => {
      const box = await heading.boundingBox();
      const vw = page.viewportSize()!.width;
      return !!box && box.x >= 0 && box.x + box.width <= vw;
    }).toBe(true);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("readpos:paper-addopanto") || "null"));
    expect(saved?.b).toBeGreaterThan(0);
    await page.reload();
    await expect(page.locator("[data-reader-ready]")).not.toHaveAttribute("data-page", "1", { timeout: 15_000 });
  });

  test("scroll mode reads top to bottom and keeps the place when switching back", async ({ page }) => {
    await page.goto("/read/pretend");
    await expect(page.locator("[data-reader-ready]")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Switch to scroll mode" }).click();
    const sc = page.locator("[data-mode=scroll][data-reader-ready]");
    await expect(sc).toBeVisible();
    // scroll mode shows real, separate pages with page numbers
    await expect(sc.locator(".bk-content").nth(1)).toBeVisible();
    await sc.evaluate((e) => e.scrollBy(0, 4000));
    await expect(sc).not.toHaveAttribute("data-page", "1");
    await expect(page.getByTestId("page-indicator")).toContainText("পৃষ্ঠা");
    await page.getByRole("button", { name: "Switch to page mode" }).click();
    await expect(page.locator("[data-page]")).not.toHaveAttribute("data-page", "1", { timeout: 10_000 });
  });

  test("page-turn sound can be switched off and stays off", async ({ page }) => {
    await page.goto("/read/pretend");
    await expect(page.locator("[data-reader-ready]")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Reading settings" }).click();
    const sw = page.getByRole("switch", { name: "Page-turn sound" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await page.reload();
    await page.getByRole("button", { name: "Reading settings" }).click();
    await expect(page.getByRole("switch", { name: "Page-turn sound" })).toHaveAttribute("aria-checked", "false");
  });

  test("PDFs and covers are served", async ({ request }) => {
    for (const path of ["/books/Pretend-Kazi-Abdul-Halim-Sunny.pdf", "/books/Paper-Addopanto-Kazi-Abdul-Halim-Sunny.pdf", "/books/pretend-cover.jpg", "/books/text/pretend.json", "/books/text/paper-addopanto.json"]) {
      expect((await request.get(path)).status()).toBe(200);
    }
  });
});

test.describe("hire me", () => {
  test("nav button leads to the hire section with an email CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Hire me" }).click();
    const hire = page.locator("#hire");
    await expect(hire.getByRole("heading", { level: 2 })).toContainText("hire me");
    const cta = hire.getByRole("link", { name: /send an offer/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /^https:\/\/mail\.google\.com\/mail\/\?view=cm.*&to=.+&su=/);
  });
});
