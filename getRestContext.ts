import { Page } from "puppeteer";
import { waitUntil } from "./waitUntil";

export declare namespace window {
  const bnhpApp: any;
}

export async function getRestContext(page: Page) {
  await waitUntil(async () => {
    return page.evaluate(() => !!window.bnhpApp);
  }, "waiting for app data load");

  const result = await page.evaluate(() => {
    return window.bnhpApp.restContext;
  });

  return result.slice(1);
}
