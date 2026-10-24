import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
});

async function sequential(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: /Shuffle/ }).uncheck();
  await page.getByRole('button', { name: 'Let’s play' }).click();
}

test('shows only a character, tap and keyboard navigate, no saved progress', async ({ page }) => {
  await sequential(page);
  const character = page.locator('.hanzi');
  await expect(character).toHaveText('一');
  await page.locator('.flashcard').tap();
  await expect(character).toHaveText('二');
  await page.keyboard.press('ArrowRight');
  await expect(character).toHaveText('三');
  await page.keyboard.press('ArrowLeft');
  await expect(character).toHaveText('二');
  await page.keyboard.press('Space');
  await expect(character).toHaveText('三');
  await page.keyboard.press('Enter');
  await expect(character).toHaveText('四');
  await expect(page.locator('.hint')).toBeEmpty();
  await page.reload();
  await expect(character).toHaveText('一');
});

test('swipes navigate exactly once; drags and cancelled gestures do not tap', async ({ page }) => {
  await sequential(page);
  const card = page.locator('.flashcard');
  const box = (await card.boundingBox())!;
  const y = box.y + box.height / 2;
  const drag = async (start: number, end: number) => {
    await page.mouse.move(start, y);
    await page.mouse.down();
    await page.mouse.move(end, y, { steps: 6 });
    await page.mouse.up();
  };
  await drag(280, 90);
  await expect(page.locator('.hanzi')).toHaveText('二');
  await drag(90, 280);
  await expect(page.locator('.hanzi')).toHaveText('一');
  await drag(200, 225);
  await expect(page.locator('.hanzi')).toHaveText('一');
  await page.mouse.move(100, y);
  await page.mouse.down();
  await card.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator('.hanzi')).toHaveText('一');
});

test('sets and appearance work; modal prevents background keyboard navigation', async ({ page }) => {
  await sequential(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: /Basic 500/ }).check();
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Close settings' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.hanzi')).toHaveText('人');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.hanzi')).toHaveText('人');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Up to 二年级/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Up to 第三册第三课/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Up to 三年级/ })).toBeVisible();
});

test('recovers from corrupt or inaccessible preferences', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('hanzi-cards:preferences:v1', '{broken'); });
  await page.goto('./');
  await expect(page.locator('.hanzi')).toHaveText(/^\p{Script=Han}$/u);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await page.reload();
  await expect(page.locator('.hanzi')).toHaveText(/^\p{Script=Han}$/u);
  await page.locator('.flashcard').click();
});

test('fits small portrait, landscape, and desktop without scrolling or clipping', async ({ page }) => {
  await page.goto('./');
  for (const [width, height] of [[320, 568], [390, 844], [430, 932], [844, 390], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const glyph = (await page.locator('.hanzi').boundingBox())!;
    expect(glyph.x).toBeGreaterThanOrEqual(0);
    expect(glyph.y).toBeGreaterThanOrEqual(0);
    expect(glyph.x + glyph.width).toBeLessThanOrEqual(width);
    expect(glyph.y + glyph.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('manifest and offline reload work under the repository subpath', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('No active service worker');
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await (await page.request.get('manifest.webmanifest')).json();
  expect(manifest.start_url).toBe('/hanzi-cards/');
  expect(manifest.scope).toBe('/hanzi-cards/');
  expect(manifest.display).toBe('standalone');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.hanzi')).toHaveText(/^\p{Script=Han}$/u);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: /Basic 500/ }).check();
  await page.getByRole('radio', { name: /Up to 第三册第三课/ }).check();
  await page.getByRole('radio', { name: /Up to 三年级/ }).check();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  const first = await page.locator('.hanzi').textContent();
  await page.locator('.flashcard').click();
  await expect(page.locator('.hanzi')).not.toHaveText(first!);
});
