import {
  lighthouseAnalyzer,
  LighthouseResults,
} from "../scraping/utils/lighthouse.js";

export interface QualificationResult {
  isQualified: boolean;
  reason:
    | "NO_WEBSITE"
    | "POOR_WEBSITE"
    | "WEBSITE_UNREACHABLE"
    | "WEBSITE_IS_GOOD";
  score: number;
  lighthouse?: LighthouseResults;
  error?: string; // Error message if qualification failed
}

export interface BusinessToQualify {
  website?: string;
  hasWebsite: boolean;
  businessName?: string;
}

export const qualificationService = {
  /**
   * Determines if a business is a qualified lead based on their website status.
   *
   * Qualification logic (updated strategy - target tech-savvy businesses):
   * - No website → NOT qualified (likely informal/small business, not our target)
   * - Poor website (low Lighthouse scores) → Qualified (they need a redesign)
   * - Good website (high Lighthouse scores) → Not qualified (they don't need us)
   * - Website unreachable → Qualified (broken site = opportunity)
   *
   * We target businesses that are established enough to have a website,
   * but the website is poor quality - these are the ideal customers.
   */
  async qualifyBusiness(
    business: BusinessToQualify,
  ): Promise<QualificationResult> {
    const businessName = business.businessName || "Unknown";

    // No website = NOT qualified (informal business, not our target)
    // A daba, street stall, or small informal shop won't need our services
    if (!business.website || !business.hasWebsite) {
      console.log(
        `[Qualification] ${businessName}: NO_WEBSITE - Skipping (not tech-savvy)`,
      );
      return {
        isQualified: false,
        reason: "NO_WEBSITE",
        score: 0,
      };
    }

    // Has website - check quality with Lighthouse
    try {
      console.log(
        `[Qualification] ${businessName}: Running Lighthouse on ${business.website}`,
      );
      const lighthouse = await lighthouseAnalyzer.analyze(business.website);

      // Good website = not a qualified lead (they don't need us)
      if (
        lighthouse.performance >= 70 &&
        lighthouse.seo >= 70 &&
        lighthouse.accessibility >= 60
      ) {
        console.log(
          `[Qualification] ${businessName}: WEBSITE_IS_GOOD (perf: ${lighthouse.performance}, seo: ${lighthouse.seo}) - Skipping`,
        );
        return {
          isQualified: false,
          reason: "WEBSITE_IS_GOOD",
          score: 0,
          lighthouse,
        };
      }

      // Poor website = qualified lead
      // Score bonus based on how poor the website is
      const performancePenalty = Math.floor(
        (100 - lighthouse.performance) / 10,
      );
      const score = 20 + performancePenalty;

      console.log(
        `[Qualification] ${businessName}: POOR_WEBSITE (perf: ${lighthouse.performance}, seo: ${lighthouse.seo}) - Qualified with score ${score}`,
      );

      return {
        isQualified: true,
        reason: "POOR_WEBSITE",
        score,
        lighthouse,
      };
    } catch (err) {
      // Website unreachable/broken = qualified lead
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log(
        `[Qualification] ${businessName}: WEBSITE_UNREACHABLE (${business.website}) - Qualified`,
      );
      console.error(`Lighthouse failed for ${business.website}:`, err);

      return {
        isQualified: true,
        reason: "WEBSITE_UNREACHABLE",
        score: 25,
        error: errorMessage,
      };
    }
  },

  /**
   * Batch qualify multiple businesses.
   * Returns only the qualified businesses with their qualification data.
   */
  async qualifyBusinesses(
    businesses: BusinessToQualify[],
  ): Promise<
    Array<BusinessToQualify & { qualification: QualificationResult }>
  > {
    const results: Array<
      BusinessToQualify & { qualification: QualificationResult }
    > = [];

    for (const business of businesses) {
      const qualification = await this.qualifyBusiness(business);

      if (qualification.isQualified) {
        results.push({
          ...business,
          qualification,
        });
      }
    }

    return results;
  },

  /**
   * Quick check without running Lighthouse (for pre-filtering).
   * Returns true if the business definitely needs qualification (has a website).
   */
  needsFullQualification(business: BusinessToQualify): boolean {
    return business.hasWebsite && !!business.website;
  },
};
