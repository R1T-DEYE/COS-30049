const { chromium } = require('/tmp/pw/node_modules/playwright');
const { mkdirSync } = require('node:fs');
const OUT = 'docs/screenshots';
const API = 'http://127.0.0.1:8000';
const FRONTEND = 'http://127.0.0.1:5173';
const seedInputs = [
  'Congratulations! You have been selected to receive a free gift card. Claim your prize now.',
  'Hi David, can we move the project meeting from Monday to Thursday? Thanks, Alex.',
  'URGENT: Your account is suspended. Confirm your details to restore access immediately.',
  'Hello, I have attached the updated sprint report. Please review it before the meeting.',
  'Limited time offer! Click the link to collect your exclusive cash reward today.',
  'Thanks for your help with testing the new application. See you next week.',
  'https://example.org/about',
  'https://example.com/limited-time-free-prize'
];
async function waitFor(url) {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Application did not become ready: ' + url);
}
async function run() {
  mkdirSync(OUT, { recursive: true });
  await waitFor(API + '/');
  await waitFor(FRONTEND + '/');
  for (const text of seedInputs) {
    const response = await fetch(API + '/predict', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('Prediction failed: ' + response.status);
    const result = await response.json();
    console.log(JSON.stringify({ sample: text.slice(0, 30), label: result.label, probability: result.probability }));
  }
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => console.error('Page error:', error.message));
  await page.goto(FRONTEND + '/', { waitUntil: 'networkidle' });
  await page.getByText('Total Emails Scanned').waitFor();
  await page.screenshot({ path: OUT + '/home.png' });
  await page.goto(FRONTEND + '/scan', { waitUntil: 'networkidle' });
  await page.locator('textarea').fill('Congratulations! You have won a free shopping voucher. Claim your gift today!');
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await page.getByText('Verdict:', { exact: false }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: OUT + '/scan-result.png' });
  await page.goto(FRONTEND + '/stats', { waitUntil: 'networkidle' });
  await page.locator('svg').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(1800);
  if (await page.locator('svg').count() < 3) throw new Error('Statistics charts did not render');
  await page.screenshot({ path: OUT + '/statistics.png', fullPage: true });
  await browser.close();
  console.log('Captured three real application screenshots.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
