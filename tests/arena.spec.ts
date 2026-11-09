import { test, expect, type Page } from "@playwright/test";
import { BUG_QS, OUT_QS, SQL_QS } from "../src/lib/arena";

async function openGame(page: Page, name: "Bug Spotter" | "Output Guess" | "SQL Rush") {
  await page.goto("/#arena");
  const arena = page.locator("#arena");
  await arena.scrollIntoViewIfNeeded();
  await arena.getByRole("tab", { name }).click();
  return arena.locator('[role="tabpanel"]:not([hidden])');
}

test.describe("dev arena", () => {
  test("Bug Spotter: clicking the buggy line is correct, round ends with a score", async ({ page }) => {
    const panel = await openGame(page, "Bug Spotter");
    await panel.getByRole("button", { name: /easy/i }).click();
    for (let i = 0; i < 5; i++) {
      const goal = (await panel.locator("p", { hasText: "Goal:" }).innerText()).replace("Goal:", "").trim();
      const q = BUG_QS.find((b) => b.task === goal)!;
      expect(q, `question for "${goal}"`).toBeTruthy();
      await panel.getByRole("button", { name: `Line ${q.bug + 1}`, exact: true }).click();
      await expect(panel.getByRole("status")).toContainText("Correct!");
      await panel.getByRole("button", { name: /Next question|See results/ }).click();
    }
    await expect(panel.getByText("5/5 correct")).toBeVisible();
    await panel.getByPlaceholder("Your name").fill("Playwright");
    await panel.getByRole("button", { name: "Save score" }).click();
    await expect(panel.getByText("Saved to the leaderboard")).toBeVisible();
    await expect(page.locator("#arena").getByText("Playwright")).toBeVisible();
  });

  test("Output Guess: a wrong pick shows the explanation", async ({ page }) => {
    const panel = await openGame(page, "Output Guess");
    await panel.getByRole("button", { name: /hard/i }).click();
    const codeText = await panel.locator(".font-mono.text-\\[12\\.5px\\]").first().innerText();
    const q = OUT_QS.find((o) => o.lines.every((l) => !l.trim() || codeText.includes(l.trim())))!;
    expect(q).toBeTruthy();
    const wrong = (q.answer + 1) % 4;
    await panel.getByRole("button", { name: new RegExp(`^${"ABCD"[wrong]}\\.`) }).click();
    await expect(panel.getByRole("status")).toContainText("Not quite.");
    await expect(panel.getByRole("status")).toContainText(q.explain.replace(/`/g, "").slice(0, 20));
  });

  test("SQL Rush: real queries run, the sandbox blocks writes", async ({ page }) => {
    const panel = await openGame(page, "SQL Rush");
    await panel.getByRole("button", { name: /medium/i }).click();
    const box = panel.getByLabel("SQL query");
    await box.fill("DROP TABLE orders");
    await panel.getByRole("button", { name: "Run" }).click();
    await expect(panel.getByText("Only SELECT queries are allowed here.")).toBeVisible();
    await box.fill("SELECT COUNT(*) AS n FROM orders");
    await panel.getByRole("button", { name: "Run" }).click();
    await expect(panel.locator("table")).toContainText("9");
    const task = await panel.locator("p.font-medium").first().innerText();
    const q = SQL_QS.find((s) => s.task === task)!;
    await box.fill(q.expected);
    await panel.getByRole("button", { name: "Submit answer" }).click();
    await expect(panel.getByRole("status")).toContainText("Correct!");
  });

  test("daily challenge reveals an answer", async ({ page }) => {
    await page.goto("/#arena");
    const daily = page.getByTestId("daily");
    await daily.scrollIntoViewIfNeeded();
    const first = daily.locator("button").first();
    await first.click();
    await expect(daily.getByText(/Solved!|Not this time/)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("daily").getByText(/Solved!|Not this time/)).toBeVisible();
  });

  test("terminal 'arena sql' opens SQL Rush", async ({ page }) => {
    await page.goto("/");
    await page.locator("#lab").scrollIntoViewIfNeeded();
    await page.locator("#lab").getByRole("tab", { name: "Terminal" }).click();
    await page.getByLabel("Terminal command").fill("arena sql");
    await page.getByLabel("Terminal command").press("Enter");
    await expect(page.locator("#arena").getByRole("tab", { name: "SQL Rush" })).toHaveAttribute("aria-selected", "true");
  });
});
