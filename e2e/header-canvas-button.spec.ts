import { expect, test } from '@playwright/test';

test('canvas helper toggles on from an edge tap after hover', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const canvasButton = page.getByRole('button', {
    name: /Load Canvas prompt and save settings|加载 Canvas 提示并保存设置/,
  });

  await expect(canvasButton).toBeVisible();

  const box = await canvasButton.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  const centerY = box.y + box.height / 2;

  // Hover first so any hover-state transform is active, then tap near the edge.
  // Keep a small inset to avoid device-pixel rounding pushing the click outside.
  await page.mouse.move(box.x + box.width / 2, centerY);
  await page.waitForTimeout(50);
  await page.mouse.move(box.x + box.width - 2, centerY);
  await page.mouse.down();
  await page.waitForTimeout(20);
  await page.mouse.up();

  await expect(
    page.getByRole('button', {
      name: /Canvas prompt is active\. Click to remove\.|Canvas 提示已激活。点击移除。/,
    }),
  ).toBeVisible();
});
