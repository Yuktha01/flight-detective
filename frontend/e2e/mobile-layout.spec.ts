import { expect, test } from "@playwright/test";

const flightResponse = {
  flight: {
    number: "SU1531",
    iata: "SU1531",
    icao: "AFL1531",
    status: "in_flight",
    date: "2026-09-28",
  },
  airline: {
    name: "Aeroflot",
    iata: "SU",
    icao: "AFL",
  },
  route: {
    departure: {
      airport: "Sheremetyevo International Airport",
      iata: "SVO",
      icao: "UUEE",
      terminal: "C",
      gate: "12",
    },
    arrival: {
      airport: "Pulkovo Airport",
      iata: "LED",
      icao: "ULLI",
      terminal: "1",
      gate: "4",
    },
  },
  departure: {
    scheduled: "2026-09-28T10:00:00+03:00",
    estimated: "2026-09-28T10:15:00+03:00",
    actual: null,
    delayMinutes: 15,
  },
  arrival: {
    scheduled: "2026-09-28T11:30:00+03:00",
    estimated: null,
    actual: null,
    delayMinutes: 8,
  },
  aircraft: {
    registration: "RA-12345",
    iata: "A320",
    icao: "A320",
  },
  live: {
    updated: "2026-09-28T10:45:00+03:00",
    latitude: 59.93,
    longitude: 30.36,
    altitudeMeters: 10000,
    direction: 180,
    speedKmh: 800,
    speedVertical: 2,
    isGround: false,
  },
  insight: {
    delayMinutes: 15,
    delayStatus: "delayed",
    summary: "This flight is delayed by 15 minutes.",
  },
};

const viewports = [
  { name: "Small Phone / WCAG Minimum (320x568)", width: 320, height: 568 },
  { name: "Android Standard (360x740)", width: 360, height: 740 },
  { name: "iPhone SE / Compact iOS (375x667)", width: 375, height: 667 },
  { name: "Modern Flagship Phone (393x852)", width: 393, height: 852 },
];

for (const vp of viewports) {
  test.describe(`Mobile Layout Verification on ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("verifies initial empty state and search bar layout", async ({ page }) => {
      await page.goto("/");  

      // 1. Verify no horizontal overflow across the whole document
      const hasHorizontalScroll = await page.evaluate(() => {  
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 2. Verify ghost-typing-layer is strictly inside input-field-wrap (position: relative fix)
      const inputWrap = page.locator(".input-field-wrap");
      const ghostLayer = page.locator(".ghost-typing-layer");
      await expect(inputWrap).toBeVisible();
      await expect(ghostLayer).toBeVisible();

      const wrapBox = await inputWrap.boundingBox();
      const ghostBox = await ghostLayer.boundingBox();
      expect(wrapBox).not.toBeNull();
      expect(ghostBox).not.toBeNull();

      if (wrapBox && ghostBox) {
        // Ghost layer must be vertically contained inside the input wrap
        expect(ghostBox.y).toBeGreaterThanOrEqual(wrapBox.y - 2);
        expect(ghostBox.y + ghostBox.height).toBeLessThanOrEqual(wrapBox.y + wrapBox.height + 4);
        // Ghost layer must be horizontally within the input wrap
        expect(ghostBox.x).toBeGreaterThanOrEqual(wrapBox.x - 2);
        expect(ghostBox.x + ghostBox.width).toBeLessThanOrEqual(wrapBox.x + wrapBox.width + 5);
      }

      // 3. Verify search action buttons stack vertically on mobile with full width
      const investigateBtn = page.getByRole("button", { name: /investigate/i });
      const surpriseBtn = page.getByRole("button", { name: /surprise me/i });
      await expect(investigateBtn).toBeVisible();
      await expect(surpriseBtn).toBeVisible();

      const invBox = await investigateBtn.boundingBox();
      const surBox = await surpriseBtn.boundingBox();
      expect(invBox).not.toBeNull();
      expect(surBox).not.toBeNull();

      if (invBox && surBox && wrapBox) {
        // Surprise Me button must be vertically below Investigate button (stacked, not squished side-by-side)
        expect(surBox.y).toBeGreaterThanOrEqual(invBox.y + invBox.height - 2);
        // Both buttons should span nearly full width of the search container
        expect(invBox.width).toBeGreaterThanOrEqual(wrapBox.width * 0.85);
        expect(surBox.width).toBeGreaterThanOrEqual(wrapBox.width * 0.85);
      }

      // 4. Verify masthead fits within the viewport without clipping or horizontal overflow
      const masthead = page.locator(".masthead");
      const mastBox = await masthead.boundingBox();
      expect(mastBox).not.toBeNull();
      if (mastBox) {
        expect(mastBox.width).toBeLessThanOrEqual(vp.width + 1);
      }
    });

    test("verifies flight briefing, lifecycle track, and route card layout", async ({ page }) => {
      await page.route("**/api/flights/SU1531*", async (route) => {
        await route.fulfill({ status: 200, json: flightResponse });
      });

      await page.goto("/");
      await page.getByRole("textbox", { name: "Enter Flight Number" }).fill("SU1531");
      await page.getByRole("button", { name: /investigate/i }).click();

      await expect(page.getByRole("heading", { name: "SU1531" })).toBeVisible();

      // 1. Verify no horizontal overflow after flight data is loaded
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // 2. Verify lifecycle track does not wrap connector lines onto separate rows
      const trackNodes = page.locator(".lifecycle-track .track-node");
      await expect(trackNodes).toHaveCount(3);
      const nodeBoxes = await Promise.all([
        trackNodes.nth(0).boundingBox(),
        trackNodes.nth(1).boundingBox(),
        trackNodes.nth(2).boundingBox(),
      ]);

      if (nodeBoxes[0] && nodeBoxes[1] && nodeBoxes[2]) {
        // All nodes must be on the same horizontal row (within 4px tolerance)
        expect(Math.abs(nodeBoxes[0].y - nodeBoxes[1].y)).toBeLessThanOrEqual(4);
        expect(Math.abs(nodeBoxes[1].y - nodeBoxes[2].y)).toBeLessThanOrEqual(4);
      }

      // 3. Verify mobile corridor pill is visible in route card
      const mobileCorridor = page.locator(".route-mobile-corridor");
      await expect(mobileCorridor).toBeVisible();
      await expect(mobileCorridor).toHaveText("SVO → LED");

      // 4. Verify native mobile boarding pass is visible, properly sized, and legible
      const mobilePass = page.locator(".mobile-boarding-pass");
      await expect(mobilePass).toBeVisible();

      // Verify legible font size on IATA codes (should be >= 26px, not shrunken to 4px)
      const originIata = page.locator(".mobile-pass-endpoint .mobile-pass-iata").first();
      await expect(originIata).toHaveText("SVO");
      const iataFontSize = await originIata.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(iataFontSize).toBeGreaterThanOrEqual(26);

      // Verify mobile info grid renders key fields
      const gateVal = page.locator(".mobile-pass-cell", { hasText: "GATE" }).locator(".mobile-pass-val");
      await expect(gateVal).toHaveText("12");

      // Verify no barcode footer or tear option in mobile view
      await expect(page.locator(".mobile-pass-barcode")).toHaveCount(0);
      await expect(page.locator(".mobile-pass-footer")).toHaveCount(0);
      await expect(page.locator(".mobile-pass-code")).toHaveCount(0);
      await expect(page.locator(".mobile-tear-btn")).toHaveCount(0);
      await expect(page.locator(".mobile-pass-divider")).toHaveCount(0);

      // 5. Verify desktop canvas is hidden on mobile in favor of the clean native mobile pass
      await expect(page.locator("#box")).toBeHidden();

      // 6. Verify route card container does not cause horizontal overflow
      const routeBox = page.locator(".geodesic-route-card");
      const rBox = await routeBox.boundingBox();
      expect(rBox).not.toBeNull();
      if (rBox) {
        expect(rBox.width).toBeLessThanOrEqual(vp.width + 1);
      }

      // 7. Verify delay insight card: icon & tag are top-aligned, summary title is below
      const iconFrame = page.locator(".insight-icon-frame");
      const delayTag = page.locator(".delay-tag");
      const summaryTitle = page.locator(".insight-summary-title");

      await expect(iconFrame).toBeVisible();
      await expect(delayTag).toBeVisible();
      await expect(summaryTitle).toBeVisible();

      const iconBox = await iconFrame.boundingBox();
      const tagBox = await delayTag.boundingBox();
      const titleBox = await summaryTitle.boundingBox();

      if (iconBox && tagBox && titleBox) {
        // Icon and Tag are on top
        expect(titleBox.y).toBeGreaterThanOrEqual(iconBox.y + iconBox.height * 0.5);
      }
    });

    test("verifies error and not-found feedback state layout", async ({ page }) => {
      await page.route("**/api/flights/ZZ9999*", async (route) => {
        await route.fulfill({
          status: 404,
          json: {
            error: {
              code: "FLIGHT_NOT_FOUND",
              message: "Flight ZZ9999 was not found in today's active schedule.",
            },
          },
        });
      });

      await page.goto("/");
      await page.getByRole("textbox", { name: "Enter Flight Number" }).fill("ZZ9999");
      await page.getByRole("button", { name: /investigate/i }).click();

      await expect(page.getByRole("heading", { name: "We could not locate that flight" })).toBeVisible();

      // Verify no horizontal overflow in error state
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify surprise button in error action row is full-width and accessible
      const errorSurpriseBtn = page.locator(".error-action-button");
      await expect(errorSurpriseBtn).toBeVisible();
      const btnBox = await errorSurpriseBtn.boundingBox();
      expect(btnBox).not.toBeNull();
      if (btnBox) {
        expect(btnBox.width).toBeGreaterThanOrEqual(vp.width * 0.7);
      }
    });

    test("verifies compact mobile footer layout preserves all important links and avoids vertical bloat", async ({ page }) => {
      await page.goto("/");

      // 1. Verify footer is present and fits within viewport width
      const footer = page.locator(".page-footer");
      await expect(footer).toBeVisible();

      const footerBox = await footer.boundingBox();
      expect(footerBox).not.toBeNull();
      if (footerBox) {
        expect(footerBox.width).toBeLessThanOrEqual(vp.width + 1);
        // Reduced height: should be comfortably compact, avoiding previous unbounded bloat
        expect(footerBox.height).toBeLessThan(600);
      }

      // 2. Verify all important links are visible and intact
      await expect(footer.getByRole("link", { name: "Search Flights" })).toBeVisible();
      await expect(footer.getByRole("link", { name: "Flight Briefing" })).toBeVisible();
      await expect(footer.getByRole("link", { name: "GitHub Repository" })).toBeVisible();
      await expect(footer.getByRole("link", { name: "LinkedIn Profile" })).toBeVisible();
      await expect(footer.getByRole("link", { name: "Architecture Specs" })).toBeVisible();
      await expect(footer.locator(".footer-status-live")).toHaveText(/API Operational/i);

      // 3. Verify footer columns are stacked cleanly without overlapping
      const navCol = footer.locator(".footer-col").first();
      const projCol = footer.locator(".footer-col").nth(1);
      const navBox = await navCol.boundingBox();
      const projBox = await projCol.boundingBox();
      expect(navBox).not.toBeNull();
      expect(projBox).not.toBeNull();
      if (navBox && projBox) {
        expect(projBox.y).toBeGreaterThanOrEqual(navBox.y + navBox.height - 2);
      }

      // 4. Verify no horizontal overflow across the whole document
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });
  });
}
