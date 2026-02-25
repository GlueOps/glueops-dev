import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://app:80';
const DEFAULT_DOMAIN = 'nonprod.antoniostacos.onglueops.com';

// Doc IDs differ from filenames. URL = routeBasePath + folder + id
const PAGES = {
  basicIngressRoute: '/deploy-applications/traefik/traefik-basic-ingressroute',
  standardIngress: '/deploy-applications/traefik/traefik-standard-ingress',
  tlsRedirect: '/deploy-applications/traefik/traefik-tls-redirect',
  clusterDomains: '/glueops-captain-domain',
  introduction: '/introduction',
};

async function gotoAndWait(page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#captain-domain-input', { timeout: 30000 });
  await page.waitForTimeout(3000);
}

async function waitForCodeBlocks(page, minCount = 1) {
  await page.waitForFunction(
    (min) => document.querySelectorAll('pre').length >= min,
    minCount,
    { timeout: 20000 }
  );
  return page.locator('pre').count();
}

test.describe('Captain Domain Feature', () => {

  test.beforeEach(async ({ page }) => {
    // Clear localStorage so tests are independent
    await page.goto(`${BASE_URL}${PAGES.introduction}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => localStorage.removeItem('glueops_captain_domain'));
  });

  test('navbar has captain domain input with correct placeholder', async ({ page }) => {
    await gotoAndWait(page, PAGES.introduction);
    const input = page.locator('#captain-domain-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', DEFAULT_DOMAIN);
  });

  test('navbar has Captain Domain label', async ({ page }) => {
    await gotoAndWait(page, PAGES.introduction);
    const label = page.locator('.captain-domain-label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('Captain Domain');
  });

  test('code blocks show default domain, not raw CAPTAIN_DOMAIN sentinel', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);
    const count = await waitForCodeBlocks(page);
    expect(count).toBeGreaterThan(0);

    // Wait for sentinel replacement to complete
    await page.waitForFunction(
      () => {
        const pres = document.querySelectorAll('pre');
        for (const pre of pres) {
          const text = pre.textContent || '';
          if (text.includes('.Values.captain_domain')) continue;
          if (text.includes('CAPTAIN_DOMAIN')) return false;
        }
        return pres.length > 0;
      },
      { timeout: 15000 }
    );

    const allText = await page.locator('pre').allTextContents();
    const hasDefault = allText.some(t => t.includes(DEFAULT_DOMAIN));
    expect(hasDefault).toBe(true);
  });

  test('typing a custom domain updates code blocks', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);
    await waitForCodeBlocks(page);

    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('prod.mycompany.onglueops.com');
    await input.press('Enter');

    await page.waitForFunction(
      (domain) => {
        const pres = document.querySelectorAll('pre');
        for (const pre of pres) {
          if ((pre.textContent || '').includes(domain)) return true;
        }
        return false;
      },
      'prod.mycompany.onglueops.com',
      { timeout: 10000 }
    );

    const allText = await page.locator('pre').allTextContents();
    const hasCustom = allText.some(t => t.includes('prod.mycompany.onglueops.com'));
    expect(hasCustom).toBe(true);
  });

  test('custom domain persists across page navigation', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);
    await waitForCodeBlocks(page);

    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('staging.acme.onglueops.rocks');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    // Navigate to another page with CAPTAIN_DOMAIN sentinels
    await gotoAndWait(page, PAGES.standardIngress);
    await waitForCodeBlocks(page);

    const inputValue = await page.locator('#captain-domain-input').inputValue();
    expect(inputValue).toBe('staging.acme.onglueops.rocks');

    await page.waitForFunction(
      (domain) => {
        const pres = document.querySelectorAll('pre');
        for (const pre of pres) {
          if ((pre.textContent || '').includes(domain)) return true;
        }
        return false;
      },
      'staging.acme.onglueops.rocks',
      { timeout: 10000 }
    );

    const allText = await page.locator('pre').allTextContents();
    const hasCustom = allText.some(t => t.includes('staging.acme.onglueops.rocks'));
    expect(hasCustom).toBe(true);
  });

  test('clear button resets to default domain', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);
    await waitForCodeBlocks(page);

    // Set a custom domain first
    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('prod.test.onglueops.com');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    // Clear button should appear (domain is non-default)
    const clearBtn = page.locator('.captain-domain-clear');
    await expect(clearBtn).toBeVisible({ timeout: 5000 });
    await clearBtn.click();
    await page.waitForTimeout(1000);

    // After clear, domain resets to default (context normalizes empty → default)
    const inputValue = await page.locator('#captain-domain-input').inputValue();
    expect(inputValue).toBe(DEFAULT_DOMAIN);

    // Code blocks should show default domain
    const allText = await page.locator('pre').allTextContents();
    const hasDefault = allText.some(t => t.includes(DEFAULT_DOMAIN));
    expect(hasDefault).toBe(true);
  });

  test('Helm templates are NOT replaced', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);
    await waitForCodeBlocks(page);

    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('prod.test.onglueops.com');
    await input.press('Enter');
    await page.waitForTimeout(2000);

    const allText = await page.locator('pre').allTextContents();
    const hasHelm = allText.some(t => t.includes('.Values.captain_domain'));
    expect(hasHelm).toBe(true);
  });

  test('domain persists after page reload via localStorage', async ({ page }) => {
    await gotoAndWait(page, PAGES.basicIngressRoute);

    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('reload-test.myorg.onglueops.com');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    const stored = await page.evaluate(() => localStorage.getItem('glueops_captain_domain'));
    expect(stored).toBe('reload-test.myorg.onglueops.com');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#captain-domain-input', { timeout: 30000 });
    await page.waitForTimeout(2000);

    const inputValue = await page.locator('#captain-domain-input').inputValue();
    expect(inputValue).toBe('reload-test.myorg.onglueops.com');
  });

  test('CAPTAIN_DOMAIN sentinel is replaced on multiple doc pages', async ({ page }) => {
    const paths = [
      PAGES.standardIngress,
      PAGES.tlsRedirect,
      PAGES.basicIngressRoute,
    ];

    for (const path of paths) {
      await gotoAndWait(page, path);
      await waitForCodeBlocks(page);

      await page.waitForFunction(
        () => {
          const pres = document.querySelectorAll('pre');
          for (const pre of pres) {
            const text = pre.textContent || '';
            if (text.includes('.Values.captain_domain')) continue;
            if (text.includes('CAPTAIN_DOMAIN')) return false;
          }
          return pres.length > 0;
        },
        { timeout: 15000 }
      );

      const allText = await page.locator('pre').allTextContents();
      for (const text of allText) {
        if (text.includes('.Values.captain_domain')) continue;
        expect(text, `Raw sentinel found on ${path}`).not.toContain('CAPTAIN_DOMAIN');
      }
    }
  });

  test('inline <CaptainDomain /> in prose updates reactively', async ({ page }) => {
    await gotoAndWait(page, PAGES.clusterDomains);

    // The cluster-domains page has <CaptainDomain /> in prose (a <span> element)
    const proseSpan = page.locator('.captain-domain-inline').first();
    await expect(proseSpan).toBeVisible({ timeout: 10000 });
    await expect(proseSpan).toHaveText(DEFAULT_DOMAIN);

    // Set a custom domain
    const input = page.locator('#captain-domain-input');
    await input.click();
    await input.fill('staging.myorg.onglueops.rocks');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    // The prose span should now show the custom domain
    await expect(proseSpan).toHaveText('staging.myorg.onglueops.rocks');
  });
});
