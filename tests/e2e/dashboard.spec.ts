import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test("sidebar has correct nav items", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator("aside nav");
    await expect(nav.getByText("Prospects")).toBeVisible();
    await expect(nav.getByText("All Leads")).toBeVisible();
    await expect(nav.getByText("Pipeline")).toBeVisible();
    await expect(nav.getByText("Resources")).toBeVisible();
  });

  test("branding shows Kodex Leads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator("aside").getByRole("link", { name: "Kodex Leads" })
    ).toBeVisible();
  });
});

test.describe("Prospects Page (Dashboard Home)", () => {
  test("shows prospect heading and stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Today's Prospects" })
    ).toBeVisible();
    await expect(page.getByText("With Contacts")).toBeVisible();
  });

  test("shows prospect cards or empty state", async ({ page }) => {
    await page.goto("/dashboard");
    const content = page.locator("main");
    // Should show either prospect cards or the empty state
    const hasCards = await content.getByText("Mark Emailed").first().isVisible().catch(() => false);
    const hasEmpty = await content.getByText("No prospects waiting").isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test("prospect card has signal pills when prospects exist", async ({ page }) => {
    await page.goto("/dashboard");
    // If there are prospects, they should have signal pills
    const hasProspects = await page.getByText("Mark Emailed").first().isVisible().catch(() => false);
    if (hasProspects) {
      const signals = page.locator(".rounded-full.text-xs.font-medium");
      await expect(signals.first()).toBeVisible();
    }
  });

  test("outreach buttons are present when prospects exist", async ({ page }) => {
    await page.goto("/dashboard");
    const hasProspects = await page.getByText("Mark Emailed").first().isVisible().catch(() => false);
    if (hasProspects) {
      await expect(page.getByText("Mark Emailed").first()).toBeVisible();
      await expect(page.getByText("Book Meeting").first()).toBeVisible();
      await expect(page.getByText("Skip").first()).toBeVisible();
    }
  });
});

test.describe("All Leads Page", () => {
  test("shows leads table heading", async ({ page }) => {
    await page.goto("/dashboard/leads");
    await expect(
      page.getByRole("heading", { name: "All Leads" })
    ).toBeVisible();
  });

  test("shows leads in table", async ({ page }) => {
    await page.goto("/dashboard/leads");
    // Should have company names in the table
    await expect(page.getByText("AIvidence Labs")).toBeVisible();
  });

  test("has outreach filter dropdown", async ({ page }) => {
    await page.goto("/dashboard/leads");
    const select = page.locator("select").first();
    await expect(select).toBeVisible();
  });

  test("has source filter dropdown", async ({ page }) => {
    await page.goto("/dashboard/leads");
    const selects = page.locator("select");
    await expect(selects.nth(1)).toBeVisible();
  });

  test("shows claim button for unclaimed leads", async ({ page }) => {
    await page.goto("/dashboard/leads");
    const claimButton = page.getByRole("button", { name: "Claim" });
    await expect(claimButton.first()).toBeVisible();
  });

  test("filter by outreach status works", async ({ page }) => {
    await page.goto("/dashboard/leads");
    const select = page.locator("select").first();
    await select.selectOption("emailed");
    // After filtering, PrivacyFirst should be visible (it's in emailed state)
    await expect(page.getByText("PrivacyFirst GmbH")).toBeVisible();
    // And leads count should update
    await expect(page.getByText(/\d+ lead/)).toBeVisible();
  });
});

test.describe("Pipeline Page", () => {
  test("shows kanban columns with headers", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    await expect(
      page.getByRole("heading", { name: "Pipeline" })
    ).toBeVisible();

    const headers = page.locator(".uppercase.tracking-wider");
    await expect(headers.getByText("Not Contacted")).toBeVisible();
    await expect(headers.getByText("Emailed")).toBeVisible();
    await expect(headers.getByText("Replied")).toBeVisible();
    await expect(headers.getByText("Meeting Booked")).toBeVisible();
    await expect(headers.getByText("Converted")).toBeVisible();
  });

  test("leads appear in correct pipeline columns", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    // AIvidence Labs is not_contacted
    await expect(page.getByText("AIvidence Labs")).toBeVisible();
    // PrivacyFirst is emailed
    await expect(page.getByText("PrivacyFirst GmbH")).toBeVisible();
    // TrustLayer is meeting_booked
    await expect(page.getByText("TrustLayer AG")).toBeVisible();
  });

  test("shows lead count per column", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    // Each column has a count badge — at least one should be > 0
    const badges = page.locator(".font-mono.bg-bg-muted");
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("has stage movement buttons on pipeline cards", async ({ page }) => {
    await page.goto("/dashboard/pipeline");
    const moveButtons = page.locator('button[title^="Move to"]');
    await expect(moveButtons.first()).toBeVisible();
  });
});

test.describe("Resources Page", () => {
  test("loads resources page", async ({ page }) => {
    await page.goto("/dashboard/resources");
    await expect(
      page.getByRole("heading", { name: /resources/i })
    ).toBeVisible();
  });
});

test.describe("Login Page", () => {
  test("shows Kodex Leads branding", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Prospecting Dashboard")).toBeVisible();
  });

  test("has email input and submit button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send magic link/i })
    ).toBeVisible();
  });
});

test.describe("Public Assessment Tools", () => {
  test("homepage shows tool cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("EU AI Act Readiness").first()).toBeVisible();
    await expect(
      page.getByText("GDPR Fine Calculator").first()
    ).toBeVisible();
    await expect(
      page.getByText("Compliance Stack Audit").first()
    ).toBeVisible();
  });

  test("EU AI Act assessment loads", async ({ page }) => {
    await page.goto("/assess/eu-ai-act");
    await expect(page.getByText("Are you ready for")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /start assessment/i })
    ).toBeVisible();
  });

  test("GDPR calculator loads", async ({ page }) => {
    await page.goto("/assess/gdpr");
    await expect(
      page.getByRole("heading", { name: /gdpr/i })
    ).toBeVisible();
  });

  test("Stack audit loads", async ({ page }) => {
    await page.goto("/assess/frameworks");
    await expect(
      page.getByRole("heading", { name: /stack|audit|framework/i })
    ).toBeVisible();
  });
});

test.describe("API Security", () => {
  test("outreach endpoint rejects unauthenticated requests", async () => {
    const res = await fetch(
      "http://localhost:3000/api/leads/20000000-0000-0000-0000-000000000001/outreach",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreach_status: "emailed" }),
      }
    );
    expect(res.status).not.toBe(200);
  });

  test("contacts endpoint rejects unauthenticated requests", async () => {
    const res = await fetch(
      "http://localhost:3000/api/leads/20000000-0000-0000-0000-000000000001/contacts"
    );
    expect(res.status).not.toBe(200);
  });

  test("cron endpoint rejects without secret", async () => {
    const res = await fetch("http://localhost:3000/api/cron");
    expect(res.status).toBe(401);
  });
});
