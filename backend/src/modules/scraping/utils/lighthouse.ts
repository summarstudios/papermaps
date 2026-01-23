import lighthouse from "lighthouse";
import puppeteer from "puppeteer";

export interface LighthouseResults {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  finalUrl?: string;
  redirected?: boolean;
  domainStatus?: "active" | "expired" | "parked" | "error";
  statusMessage?: string;
}

export interface LighthouseError {
  error: string;
  url: string;
  timestamp: Date;
}

// Common parked/expired domain indicators
const PARKED_DOMAIN_INDICATORS = [
  "domain is for sale",
  "this domain is parked",
  "buy this domain",
  "domain expired",
  "this domain has expired",
  "domain registration",
  "godaddy",
  "namecheap parking",
  "sedo domain parking",
  "hugedomains",
  "dan.com",
  "afternic",
  "parked by",
  "domain parking",
  "this webpage is parked",
  "renew this domain",
];

export const lighthouseAnalyzer = {
  async analyze(url: string): Promise<LighthouseResults> {
    let browser = null;

    // Ensure URL has protocol
    let fullUrl = url.trim();
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = `https://${fullUrl}`;
    }

    console.log(`[Lighthouse] Starting analysis for: ${fullUrl}`);

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      page.setDefaultTimeout(30000);

      let finalUrl = fullUrl;
      let redirected = false;
      let domainStatus: "active" | "expired" | "parked" | "error" = "active";
      let statusMessage: string | undefined;

      try {
        const response = await page.goto(fullUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        finalUrl = page.url();

        if (finalUrl !== fullUrl) {
          redirected = true;
          console.log(`[Lighthouse] Redirected: ${fullUrl} -> ${finalUrl}`);
        }

        // Check HTTP status
        if (response) {
          const status = response.status();
          if (status >= 400) {
            domainStatus = "error";
            statusMessage = `HTTP ${status} error`;
            throw new Error(`Website returned HTTP ${status} error`);
          }
        }

        // Check for parked/expired domain indicators
        const pageContent = await page.content();
        const pageTitle = await page.title();
        const fullText = `${pageContent} ${pageTitle}`.toLowerCase();

        for (const indicator of PARKED_DOMAIN_INDICATORS) {
          if (fullText.includes(indicator.toLowerCase())) {
            domainStatus = "parked";
            statusMessage = `Domain appears to be parked or expired (detected: "${indicator}")`;
            console.log(`[Lighthouse] ${statusMessage}`);
            break;
          }
        }

        // Check if redirected to a completely different domain (possible expired domain redirect)
        if (redirected) {
          const originalDomain = new URL(fullUrl).hostname.replace("www.", "");
          const finalDomain = new URL(finalUrl).hostname.replace("www.", "");

          if (
            !finalDomain.includes(originalDomain) &&
            !originalDomain.includes(finalDomain)
          ) {
            // Redirected to a completely different domain
            domainStatus = "expired";
            statusMessage = `Domain redirects to different site: ${finalDomain}`;
            console.log(`[Lighthouse] ${statusMessage}`);
          }
        }
      } catch (navError) {
        const navMessage =
          navError instanceof Error ? navError.message : "Navigation failed";
        console.error(`[Lighthouse] Navigation error: ${navMessage}`);

        // Check for DNS/connection errors that indicate expired domain
        if (
          navMessage.includes("net::ERR_NAME_NOT_RESOLVED") ||
          navMessage.includes("DNS") ||
          navMessage.includes("NXDOMAIN")
        ) {
          domainStatus = "expired";
          statusMessage = "Domain does not exist (DNS resolution failed)";
          throw new Error(statusMessage);
        }

        if (
          navMessage.includes("net::ERR_CONNECTION_REFUSED") ||
          navMessage.includes("net::ERR_CONNECTION_TIMED_OUT")
        ) {
          domainStatus = "error";
          statusMessage = "Website is not responding (connection failed)";
          throw new Error(statusMessage);
        }

        // Try HTTP if HTTPS failed
        if (fullUrl.startsWith("https://")) {
          const httpUrl = fullUrl.replace("https://", "http://");
          console.log(`[Lighthouse] Retrying with HTTP: ${httpUrl}`);

          try {
            await page.goto(httpUrl, {
              waitUntil: "networkidle2",
              timeout: 30000,
            });
            finalUrl = page.url();
            redirected = finalUrl !== httpUrl;
          } catch {
            domainStatus = "error";
            statusMessage = `Website is not accessible: ${navMessage}`;
            throw new Error(statusMessage);
          }
        } else {
          domainStatus = "error";
          statusMessage = `Website is not accessible: ${navMessage}`;
          throw new Error(statusMessage);
        }
      }

      await page.close();

      // Get the WebSocket endpoint for Lighthouse
      const wsEndpoint = browser.wsEndpoint();
      const port = parseInt(new URL(wsEndpoint).port, 10);

      console.log(`[Lighthouse] Running analysis on ${finalUrl}`);

      const result = await lighthouse(finalUrl, {
        port,
        output: "json",
        logLevel: "error",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        maxWaitForFcp: 30000,
        maxWaitForLoad: 45000,
      });

      if (!result || !result.lhr) {
        throw new Error(
          "Lighthouse failed to generate report - website may have issues",
        );
      }

      const { categories, runWarnings, runtimeError } = result.lhr;

      if (runtimeError) {
        console.error(`[Lighthouse] Runtime error:`, runtimeError);
        throw new Error(
          `Lighthouse error: ${runtimeError.message || runtimeError.code}`,
        );
      }

      if (runWarnings && runWarnings.length > 0) {
        console.warn(`[Lighthouse] Warnings:`, runWarnings);
      }

      if (!categories || Object.keys(categories).length === 0) {
        throw new Error(
          "Lighthouse returned no data - website may be blocking analysis",
        );
      }

      // Check for missing scores
      const missingScores: string[] = [];
      if (categories.performance?.score == null)
        missingScores.push("performance");
      if (categories.accessibility?.score == null)
        missingScores.push("accessibility");
      if (categories["best-practices"]?.score == null)
        missingScores.push("best-practices");
      if (categories.seo?.score == null) missingScores.push("seo");

      if (missingScores.length > 0) {
        throw new Error(
          `Could not calculate: ${missingScores.join(", ")}. Website may have loading issues.`,
        );
      }

      const scores: LighthouseResults = {
        performance: Math.round(categories.performance.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        bestPractices: Math.round(categories["best-practices"].score * 100),
        seo: Math.round(categories.seo.score * 100),
        finalUrl: redirected ? finalUrl : undefined,
        redirected,
        domainStatus,
        statusMessage,
      };

      console.log(
        `[Lighthouse] Complete - Performance: ${scores.performance}, SEO: ${scores.seo}, Accessibility: ${scores.accessibility}, Best Practices: ${scores.bestPractices}`,
      );

      return scores;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`[Lighthouse] FAILED: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  },

  needsRedesign(results: LighthouseResults): boolean {
    return (
      results.performance < 50 || results.seo < 50 || results.accessibility < 40
    );
  },
};
