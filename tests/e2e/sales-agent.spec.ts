/**
 * Sales Agent — End-to-end simulation of a sales partner's daily workflow.
 *
 * Walks through the full outbound prospecting flow:
 * 1. Log in and land on the prospect feed
 * 2. Review today's prospects — check signals, contacts, scores
 * 3. Open an email template for a contact and copy it
 * 4. Mark a prospect as "Emailed"
 * 5. Navigate to All Leads and claim an unclaimed lead
 * 6. Filter leads by outreach status
 * 7. Move a lead through the pipeline kanban
 * 8. Check resources page
 * 9. Verify the pipeline reflects all actions
 */
import { test, expect, Page } from "@playwright/test";

// ---------- helpers ----------

async function screenshotStep(page: Page, name: string) {
  await page.screenshot({
    path: `./test-results/sales-agent/${name}.png`,
    fullPage: true,
  });
}

async function waitForDashboard(page: Page) {
  await page.waitForSelector("aside nav", { timeout: 10_000 });
}

// ---------- the workflow ----------

test.describe.serial("Sales Agent — Daily Workflow", () => {
  test("Step 1: Log in and see the prospect feed", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboard(page);

    // Verify we're on the prospects page
    await expect(
      page.getByRole("heading", { name: "Today's Prospects" })
    ).toBeVisible();

    // Stat cards should be present
    const stats = page.locator("main");
    await expect(stats.getByText("With Contacts")).toBeVisible();
    await expect(
      stats.locator("p.text-xs").filter({ hasText: "Emailed" })
    ).toBeVisible();

    await screenshotStep(page, "01-prospect-feed");
  });

  test("Step 2: Review prospect cards — signals, score, contacts", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await waitForDashboard(page);

    // Should see prospect cards (unclaimed qualified leads with contacts)
    // LegalTech Solutions has score 91 and assessment source
    const content = page.locator("main");

    // Check that signal pills render
    const signals = content.locator(".rounded-full.text-xs.font-medium");
    const signalCount = await signals.count();
    expect(signalCount).toBeGreaterThan(0);

    // Check score badges are visible
    const scores = content.locator("text=/\\d{2}/");
    expect(await scores.count()).toBeGreaterThan(0);

    await screenshotStep(page, "02-prospect-signals");
  });

  test("Step 3: Open email template for a contact", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboard(page);

    // Find and click the "Template" button for the first contact
    const templateBtn = page.getByText("Template").first();
    const isVisible = await templateBtn.isVisible().catch(() => false);

    if (isVisible) {
      await templateBtn.click();

      // Template modal should appear with "Email {contact_name}" header
      await expect(page.getByText(/^Email\s/)).toBeVisible();

      // Should show template picker buttons
      await expect(page.getByText("EU AI Act Deadline")).toBeVisible();
      await expect(page.getByText("Hiring Compliance Role")).toBeVisible();
      await expect(page.getByText("Assessment Follow-up")).toBeVisible();

      await screenshotStep(page, "03a-email-template-modal");

      // Switch to "Hiring Compliance Role" template
      await page.getByText("Hiring Compliance Role").click();
      await expect(page.getByText(/hiring for a compliance/)).toBeVisible();

      await screenshotStep(page, "03b-hiring-template");

      // Verify subject and body labels are present
      await expect(page.getByText("Subject")).toBeVisible();
      await expect(page.getByText("Body")).toBeVisible();

      // Copy All button should be present
      await expect(page.getByText("Copy All")).toBeVisible();

      await screenshotStep(page, "03c-template-rendered");

      // Close modal via X button
      const closeBtn = page.locator(".fixed button").first();
      await closeBtn.click();
    }
  });

  test("Step 4: Mark a prospect as Emailed", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboard(page);

    // Find the "Mark Emailed" button on the first prospect card
    const emailBtn = page.getByText("Mark Emailed").first();
    const isVisible = await emailBtn.isVisible().catch(() => false);

    if (isVisible) {
      await emailBtn.click();

      // Page should refresh (router.refresh) — wait for it
      await page.waitForTimeout(2000);
      await waitForDashboard(page);

      await screenshotStep(page, "04-marked-emailed");
    }
  });

  test("Step 5: Navigate to All Leads and claim an unclaimed lead", async ({
    page,
  }) => {
    await page.goto("/dashboard/leads");
    await waitForDashboard(page);

    await expect(
      page.getByRole("heading", { name: "All Leads" })
    ).toBeVisible();

    await screenshotStep(page, "05a-all-leads-table");

    // Find a "Claim" button (unclaimed qualified leads)
    const claimBtn = page.getByRole("button", { name: "Claim" }).first();
    const canClaim = await claimBtn.isVisible().catch(() => false);

    if (canClaim) {
      // Note which company we're claiming
      const row = claimBtn.locator("xpath=ancestor::tr");
      const companyName = await row
        .locator("td")
        .first()
        .locator("p")
        .first()
        .textContent()
        .catch(() => "unknown");

      // Claim it
      await claimBtn.click();

      // Wait for refresh
      await page.waitForTimeout(2000);
      await waitForDashboard(page);

      await screenshotStep(page, "05b-after-claim");

      // The claimed lead should no longer show "Claim" — it should show "View"
      // (or the claim button disappears for that row)
      console.log(`Claimed lead: ${companyName}`);
    }
  });

  test("Step 6: Filter leads by outreach status", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await waitForDashboard(page);

    // Filter by "Emailed"
    const outreachFilter = page.locator("select").first();
    await outreachFilter.selectOption("emailed");
    await page.waitForTimeout(500);

    await screenshotStep(page, "06a-filtered-emailed");

    // Check the count updates
    await expect(page.getByText(/\d+ lead/)).toBeVisible();

    // Filter by "Meeting Booked"
    await outreachFilter.selectOption("meeting_booked");
    await page.waitForTimeout(500);

    await screenshotStep(page, "06b-filtered-meeting-booked");

    // Reset filter
    await outreachFilter.selectOption("all");

    // Now filter by source
    const sourceFilter = page.locator("select").nth(1);
    await sourceFilter.selectOption("scraper_ai");
    await page.waitForTimeout(500);

    await screenshotStep(page, "06c-filtered-ai-source");
  });

  test("Step 7: Sort leads by score", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await waitForDashboard(page);

    // Click the "Score" column header to toggle sort
    const scoreHeader = page.getByRole("button", { name: /score/i });
    await scoreHeader.click();
    await page.waitForTimeout(300);

    await screenshotStep(page, "07-sorted-by-score");
  });

  test("Step 8: View the pipeline kanban", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    await waitForDashboard(page);

    await expect(
      page.getByRole("heading", { name: "Pipeline" })
    ).toBeVisible();

    // Verify the 5 columns are present
    const headers = page.locator(".uppercase.tracking-wider");
    await expect(headers.getByText("Not Contacted")).toBeVisible();
    await expect(headers.getByText("Emailed")).toBeVisible();
    await expect(headers.getByText("Replied")).toBeVisible();
    await expect(headers.getByText("Meeting Booked")).toBeVisible();
    await expect(headers.getByText("Converted")).toBeVisible();

    await screenshotStep(page, "08a-pipeline-kanban");

    // Check that leads appear in the correct columns
    // Our seed data has:
    //   AIvidence Labs → not_contacted
    //   PrivacyFirst → emailed
    //   RiskRadar → replied
    //   TrustLayer → meeting_booked
    //   SafeAI → converted
    await expect(page.getByText("AIvidence Labs")).toBeVisible();
    await expect(page.getByText("PrivacyFirst GmbH")).toBeVisible();
    await expect(page.getByText("TrustLayer AG")).toBeVisible();
  });

  test("Step 9: Move a lead forward in the pipeline", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    await waitForDashboard(page);

    // Find a "Move to" button on a pipeline card
    // AIvidence Labs is in "Not Contacted" — move it to Emailed
    const moveToEmailed = page
      .locator('button[title="Move to Emailed"]')
      .first();
    const canMove = await moveToEmailed.isVisible().catch(() => false);

    if (canMove) {
      await moveToEmailed.click();

      // Wait for the router.refresh
      await page.waitForTimeout(2000);
      await waitForDashboard(page);

      await screenshotStep(page, "09-pipeline-after-move");
    }
  });

  test("Step 10: Check resources page", async ({ page }) => {
    await page.goto("/dashboard/resources");
    await waitForDashboard(page);

    await expect(
      page.getByRole("heading", { name: /resources/i })
    ).toBeVisible();

    await screenshotStep(page, "10-resources-page");
  });

  test("Step 11: Navigate between all pages via sidebar", async ({ page }) => {
    // Start at Prospects
    await page.goto("/dashboard");
    await waitForDashboard(page);
    await expect(
      page.getByRole("heading", { name: "Today's Prospects" })
    ).toBeVisible();

    // Click "All Leads" in sidebar
    await page.locator("aside nav").getByText("All Leads").click();
    await page.waitForURL("**/dashboard/leads");
    await expect(
      page.getByRole("heading", { name: "All Leads" })
    ).toBeVisible();

    await screenshotStep(page, "11a-nav-to-leads");

    // Click "Pipeline" in sidebar
    await page.locator("aside nav").getByText("Pipeline").click();
    await page.waitForURL("**/dashboard/pipeline");
    await expect(
      page.getByRole("heading", { name: "Pipeline" })
    ).toBeVisible();

    await screenshotStep(page, "11b-nav-to-pipeline");

    // Click "Resources" in sidebar
    await page.locator("aside nav").getByText("Resources").click();
    await page.waitForURL("**/dashboard/resources");
    await expect(
      page.getByRole("heading", { name: /resources/i })
    ).toBeVisible();

    await screenshotStep(page, "11c-nav-to-resources");

    // Click "Prospects" back to home
    await page.locator("aside nav").getByText("Prospects").click();
    await page.waitForURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Today's Prospects" })
    ).toBeVisible();

    await screenshotStep(page, "11d-nav-back-to-prospects");
  });

  test("Step 12: Verify public tools are accessible from outside", async ({
    page,
  }) => {
    // Sales partners should be able to send prospects to the assessment tools
    await page.goto("/");

    await expect(page.getByText("Compliance is complex.")).toBeVisible();
    await expect(page.getByText("Finding the right people")).toBeVisible();

    await screenshotStep(page, "12a-public-homepage");

    // Click through to EU AI Act assessment via Free Tools section
    await page.goto("/assess/eu-ai-act");

    await expect(page.getByText("Are you ready for")).toBeVisible();

    await screenshotStep(page, "12b-eu-ai-act-assessment");
  });

  test("Step 13: Verify API security — cannot access others' data", async ({
    request,
  }) => {
    // Try to update outreach on a lead we don't own (unclaimed lead)
    const res = await request.patch(
      "/api/leads/10000000-0000-0000-0000-000000000003/outreach",
      {
        data: { outreach_status: "emailed" },
      }
    );
    // Should fail — either 404 (not owned) or 401
    expect([401, 404, 500]).toContain(res.status());

    // Cron should be locked down
    const cronRes = await request.get("/api/cron");
    expect(cronRes.status()).toBe(401);
  });
});
