import { Page } from "puppeteer";

export async function blockAssets(page: Page) {
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (request.resourceType() === "image" ||
      request.resourceType() === "stylesheet" ||
      request.resourceType() === "media" ||
      request.resourceType() === "font")
      request.abort();
    else
      request.continue();
  });
}
