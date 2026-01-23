import { chromium } from "playwright-extra";
import type { Browser, Page } from "playwright-core";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Add stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

export interface TechStackResult {
  cms?: string;
  framework?: string;
  hosting?: string;
  ecommerce?: string;
  analytics: string[];
  marketing: string[];
  security: {
    hasSSL: boolean;
    sslIssuer?: string;
  };
  mobile: {
    isResponsive: boolean;
    hasViewportMeta: boolean;
  };
  performance: {
    loadTimeMs: number;
    pageSize?: string;
    issues: string[];
  };
  jsLibraries: string[];
  cssFrameworks: string[];
  fonts: string[];
  socialIntegrations: string[];
  chatbots: string[];
  otherTechnologies: string[];
  recommendations: string[];
  scanTimestamp: string;
}

// CMS detection patterns - check HTML source for these signatures
const CMS_PATTERNS: Record<string, RegExp[]> = {
  WordPress: [
    /wp-content/i,
    /wp-includes/i,
    /wp-json/i,
    /<meta name="generator" content="WordPress/i,
  ],
  Shopify: [/cdn\.shopify\.com/i, /Shopify\.theme/i, /<meta name="shopify/i],
  Wix: [/wix\.com/i, /wixstatic\.com/i, /_wix_browser_sess/i],
  Squarespace: [/squarespace\.com/i, /static\.squarespace/i, /sqsp/i],
  Webflow: [/webflow\.com/i, /assets\.website-files\.com/i],
  Joomla: [/\/media\/jui\//i, /<meta name="generator" content="Joomla/i],
  Drupal: [/drupal\.js/i, /sites\/default\/files/i, /Drupal\.settings/i],
  Ghost: [/ghost\.org/i, /ghost-url/i],
  Weebly: [/weebly\.com/i, /editmysite\.com/i],
  GoDaddy: [/godaddy\.com/i, /secureserver\.net/i],
  "Google Sites": [/sites\.google\.com/i],
  Blogger: [/blogger\.com/i, /blogspot\.com/i],
  Magento: [/mage\/cookies/i, /Magento_/i, /magento/i],
  PrestaShop: [/prestashop/i, /PrestaShop/i],
  OpenCart: [/opencart/i, /catalog\/view/i],
  BigCommerce: [/bigcommerce\.com/i, /cdn\.bcapp/i],
};

// JavaScript framework detection
const JS_FRAMEWORK_PATTERNS: Record<string, RegExp[]> = {
  React: [
    /react\.production\.min\.js/i,
    /_reactRootContainer/i,
    /__NEXT_DATA__/i,
  ],
  "Next.js": [/__NEXT_DATA__/i, /_next\/static/i, /next\.config/i],
  Vue: [/vue\.js/i, /vue\.min\.js/i, /__VUE__/i, /vue@/i],
  "Nuxt.js": [/__NUXT__/i, /_nuxt\//i],
  Angular: [/angular\.js/i, /ng-app/i, /ng-controller/i, /@angular/i],
  jQuery: [/jquery\.min\.js/i, /jquery-\d/i, /jQuery/],
  Bootstrap: [/bootstrap\.min\.js/i, /bootstrap\.css/i, /bootstrap@/i],
  "Tailwind CSS": [/tailwindcss/i, /tailwind\.min\.css/i],
  "Material UI": [/material-ui/i, /@mui/i],
  Ember: [/ember\.js/i, /ember-cli/i],
  Svelte: [/svelte/i, /__svelte/i],
  Gatsby: [/gatsby/i, /___gatsby/i],
};

// Analytics detection
const ANALYTICS_PATTERNS: Record<string, RegExp[]> = {
  "Google Analytics": [
    /google-analytics\.com\/analytics/i,
    /googletagmanager\.com/i,
    /gtag\(/i,
    /ga\('create'/i,
    /UA-\d+-\d+/i,
    /G-[A-Z0-9]+/i,
  ],
  "Google Tag Manager": [/googletagmanager\.com\/gtm\.js/i, /GTM-[A-Z0-9]+/i],
  "Facebook Pixel": [/connect\.facebook\.net/i, /fbq\(/i, /facebook\.com\/tr/i],
  Hotjar: [/hotjar\.com/i, /hj\(/i],
  Mixpanel: [/mixpanel\.com/i, /mixpanel\.track/i],
  Segment: [/segment\.com/i, /analytics\.js/i],
  Heap: [/heap-\d+\.js/i, /heapanalytics\.com/i],
  Amplitude: [/amplitude\.com/i, /amplitude\.getInstance/i],
  Clarity: [/clarity\.ms/i, /microsoft.*clarity/i],
  Plausible: [/plausible\.io/i],
  Matomo: [/matomo\.js/i, /piwik\.js/i],
};

// Marketing tools detection
const MARKETING_PATTERNS: Record<string, RegExp[]> = {
  Mailchimp: [/mailchimp\.com/i, /mc\.us\d+\.list-manage/i],
  HubSpot: [/hubspot\.com/i, /hs-scripts\.com/i, /hbspt\./i],
  Klaviyo: [/klaviyo\.com/i],
  ActiveCampaign: [/activehosted\.com/i],
  Intercom: [/intercom\.io/i, /intercomSettings/i],
  Drift: [/drift\.com/i, /driftt\.com/i],
  Zendesk: [/zendesk\.com/i, /zdassets\.com/i],
  Crisp: [/crisp\.chat/i],
  "Tawk.to": [/tawk\.to/i, /embed\.tawk/i],
  LiveChat: [/livechatinc\.com/i],
  Freshdesk: [/freshdesk\.com/i],
  "WhatsApp Chat": [/wa\.me/i, /whatsapp\.com/i, /whatsapp-widget/i],
  Tidio: [/tidio\.co/i, /tidiochat/i],
};

// E-commerce detection
const ECOMMERCE_PATTERNS: Record<string, RegExp[]> = {
  WooCommerce: [/woocommerce/i, /wc-ajax/i, /add-to-cart/i],
  Shopify: [/shopify/i, /cdn\.shopify/i],
  Magento: [/magento/i, /checkout\/cart/i],
  BigCommerce: [/bigcommerce/i],
  PrestaShop: [/prestashop/i],
  OpenCart: [/opencart/i],
  Ecwid: [/ecwid\.com/i],
  Razorpay: [/razorpay\.com/i, /razorpay/i],
  PayPal: [/paypal\.com/i, /paypalobjects/i],
  Stripe: [/stripe\.com/i, /js\.stripe/i],
};

// Social integration patterns
const SOCIAL_PATTERNS: Record<string, RegExp[]> = {
  "Facebook SDK": [/connect\.facebook\.net\/.*\/sdk\.js/i],
  "Twitter Widget": [/platform\.twitter\.com/i],
  "Instagram Embed": [/instagram\.com\/embed/i],
  "LinkedIn Share": [/linkedin\.com\/share/i],
  "YouTube Embed": [/youtube\.com\/embed/i, /youtube-nocookie\.com/i],
  Pinterest: [/assets\.pinterest\.com/i, /pinit\.js/i],
};

// CSS Framework patterns
const CSS_FRAMEWORK_PATTERNS: Record<string, RegExp[]> = {
  Bootstrap: [
    /bootstrap\.min\.css/i,
    /bootstrap\.css/i,
    /cdn\.jsdelivr.*bootstrap/i,
  ],
  "Tailwind CSS": [/tailwind/i],
  Bulma: [/bulma\.min\.css/i, /bulma\.css/i],
  Foundation: [/foundation\.min\.css/i],
  "Material Design": [/material.*\.css/i, /@material/i],
  "Semantic UI": [/semantic\.min\.css/i],
  "Ant Design": [/antd/i],
};

// Font detection
const FONT_PATTERNS: Record<string, RegExp[]> = {
  "Google Fonts": [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i],
  "Adobe Fonts": [/use\.typekit\.net/i],
  "Font Awesome": [/font-awesome/i, /fontawesome/i],
  "Custom Fonts": [/@font-face/i],
};

class TechStackScanner {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private detectPatterns(
    content: string,
    patterns: Record<string, RegExp[]>,
  ): string[] {
    const detected: string[] = [];
    for (const [name, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        if (regex.test(content)) {
          detected.push(name);
          break;
        }
      }
    }
    return detected;
  }

  private detectSinglePattern(
    content: string,
    patterns: Record<string, RegExp[]>,
  ): string | undefined {
    for (const [name, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        if (regex.test(content)) {
          return name;
        }
      }
    }
    return undefined;
  }

  async scan(url: string): Promise<TechStackResult> {
    await this.init();

    const result: TechStackResult = {
      analytics: [],
      marketing: [],
      security: { hasSSL: false },
      mobile: { isResponsive: false, hasViewportMeta: false },
      performance: { loadTimeMs: 0, issues: [] },
      jsLibraries: [],
      cssFrameworks: [],
      fonts: [],
      socialIntegrations: [],
      chatbots: [],
      otherTechnologies: [],
      recommendations: [],
      scanTimestamp: new Date().toISOString(),
    };

    // Ensure URL has protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Check SSL
    result.security.hasSSL = url.startsWith("https://");

    let page: Page | null = null;
    const startTime = Date.now();

    try {
      page = await this.browser!.newPage();

      // Set a realistic viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate with timeout
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      result.performance.loadTimeMs = Date.now() - startTime;

      // Get the full HTML content
      const htmlContent = await page.content();

      // Get all script sources using $$eval (safer for TypeScript)
      const scripts = await page
        .$$eval("script[src]", (elements) =>
          elements.map((s) => s.getAttribute("src") || ""),
        )
        .catch(() => [] as string[]);

      // Get all stylesheet sources
      const stylesheets = await page
        .$$eval('link[rel="stylesheet"]', (elements) =>
          elements.map((l) => l.getAttribute("href") || ""),
        )
        .catch(() => [] as string[]);

      // Combine all content for pattern matching
      const allContent =
        htmlContent + "\n" + scripts.join("\n") + "\n" + stylesheets.join("\n");

      // Detect CMS
      result.cms = this.detectSinglePattern(allContent, CMS_PATTERNS);

      // Detect JavaScript frameworks
      const jsFrameworks = this.detectPatterns(
        allContent,
        JS_FRAMEWORK_PATTERNS,
      );
      result.jsLibraries = jsFrameworks.filter(
        (f) => !["Bootstrap", "Tailwind CSS", "Material UI"].includes(f),
      );

      // Set main framework (prioritize full frameworks over libraries)
      const frameworkPriority = [
        "Next.js",
        "Nuxt.js",
        "Gatsby",
        "React",
        "Vue",
        "Angular",
        "Svelte",
        "Ember",
      ];
      for (const fw of frameworkPriority) {
        if (jsFrameworks.includes(fw)) {
          result.framework = fw;
          break;
        }
      }

      // Detect CSS frameworks
      result.cssFrameworks = this.detectPatterns(
        allContent,
        CSS_FRAMEWORK_PATTERNS,
      );

      // Detect analytics
      result.analytics = this.detectPatterns(allContent, ANALYTICS_PATTERNS);

      // Detect marketing tools (including chatbots)
      const marketingTools = this.detectPatterns(
        allContent,
        MARKETING_PATTERNS,
      );
      result.chatbots = marketingTools.filter((t) =>
        [
          "Intercom",
          "Drift",
          "Crisp",
          "Tawk.to",
          "LiveChat",
          "WhatsApp Chat",
          "Tidio",
        ].includes(t),
      );
      result.marketing = marketingTools.filter(
        (t) => !result.chatbots.includes(t),
      );

      // Detect e-commerce
      const ecommerceTools = this.detectPatterns(
        allContent,
        ECOMMERCE_PATTERNS,
      );
      if (ecommerceTools.length > 0) {
        // Set main e-commerce platform (not payment gateways)
        const platforms = ecommerceTools.filter(
          (e) => !["Razorpay", "PayPal", "Stripe"].includes(e),
        );
        if (platforms.length > 0) {
          result.ecommerce = platforms[0];
        }
        // Add payment gateways to other technologies
        const paymentGateways = ecommerceTools.filter((e) =>
          ["Razorpay", "PayPal", "Stripe"].includes(e),
        );
        result.otherTechnologies.push(...paymentGateways);
      }

      // Detect social integrations
      result.socialIntegrations = this.detectPatterns(
        allContent,
        SOCIAL_PATTERNS,
      );

      // Detect fonts
      result.fonts = this.detectPatterns(allContent, FONT_PATTERNS);

      // Check mobile responsiveness
      const viewportMeta = await page
        .$eval('meta[name="viewport"]', (el) => el.getAttribute("content"))
        .catch(() => null);

      result.mobile.hasViewportMeta = !!viewportMeta;
      result.mobile.isResponsive =
        !!viewportMeta && viewportMeta.includes("width=device-width");

      // Get SSL issuer if HTTPS
      if (response && result.security.hasSSL) {
        try {
          const securityDetails = await response.securityDetails();
          if (securityDetails) {
            // issuer is a property in playwright-core
            result.security.sslIssuer = securityDetails.issuer;
          }
        } catch {
          // Security details not available
        }
      }

      // Detect hosting from headers or content
      const serverHeader = response?.headers()["server"];
      if (serverHeader) {
        if (/cloudflare/i.test(serverHeader)) {
          result.hosting = "Cloudflare";
        } else if (/nginx/i.test(serverHeader)) {
          result.otherTechnologies.push("Nginx");
        } else if (/apache/i.test(serverHeader)) {
          result.otherTechnologies.push("Apache");
        } else if (/microsoft|iis/i.test(serverHeader)) {
          result.hosting = "Microsoft IIS";
        }
      }

      // Detect hosting from content patterns
      if (!result.hosting) {
        if (/vercel/i.test(allContent) || /\.vercel\.app/i.test(url)) {
          result.hosting = "Vercel";
        } else if (/netlify/i.test(allContent) || /\.netlify\.app/i.test(url)) {
          result.hosting = "Netlify";
        } else if (/amazonaws\.com/i.test(allContent)) {
          result.hosting = "AWS";
        } else if (/googleapis\.com\/.*storage/i.test(allContent)) {
          result.hosting = "Google Cloud";
        } else if (/azurewebsites/i.test(url)) {
          result.hosting = "Azure";
        } else if (/godaddy/i.test(allContent)) {
          result.hosting = "GoDaddy";
        } else if (/hostinger/i.test(allContent)) {
          result.hosting = "Hostinger";
        } else if (/bluehost/i.test(allContent)) {
          result.hosting = "Bluehost";
        }
      }

      // Performance issues detection
      if (result.performance.loadTimeMs > 5000) {
        result.performance.issues.push("Slow page load (>5 seconds)");
      }
      if (!result.security.hasSSL) {
        result.performance.issues.push("No SSL certificate");
      }
      if (!result.mobile.isResponsive) {
        result.performance.issues.push("Not mobile responsive");
      }

      // Generate recommendations
      if (!result.security.hasSSL) {
        result.recommendations.push("Add SSL certificate for security and SEO");
      }
      if (!result.mobile.isResponsive) {
        result.recommendations.push(
          "Make website mobile responsive - over 60% of traffic is mobile",
        );
      }
      if (result.analytics.length === 0) {
        result.recommendations.push(
          "Add Google Analytics to track visitor behavior",
        );
      }
      if (result.chatbots.length === 0) {
        result.recommendations.push(
          "Add live chat (Tawk.to, WhatsApp) for better customer engagement",
        );
      }
      if (!result.cms && !result.framework) {
        result.recommendations.push(
          "Consider using a modern CMS or framework for easier maintenance",
        );
      }
      if (
        result.cms === "WordPress" &&
        !result.otherTechnologies.includes("WooCommerce")
      ) {
        result.recommendations.push(
          "Consider WooCommerce if you need e-commerce functionality",
        );
      }
      if (result.performance.loadTimeMs > 3000) {
        result.recommendations.push(
          "Optimize page speed - slow sites lose visitors",
        );
      }
      if (result.jsLibraries.includes("jQuery") && !result.framework) {
        result.recommendations.push(
          "Consider modernizing from jQuery to React/Vue for better performance",
        );
      }
    } catch (error) {
      console.error(`Error scanning ${url}:`, error);
      result.performance.issues.push(
        `Failed to fully scan: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      if (page) {
        await page.close();
      }
    }

    return result;
  }
}

// Singleton instance
let scannerInstance: TechStackScanner | null = null;

export async function scanTechStack(url: string): Promise<TechStackResult> {
  if (!scannerInstance) {
    scannerInstance = new TechStackScanner();
  }
  return scannerInstance.scan(url);
}

export async function closeTechStackScanner(): Promise<void> {
  if (scannerInstance) {
    await scannerInstance.close();
    scannerInstance = null;
  }
}
