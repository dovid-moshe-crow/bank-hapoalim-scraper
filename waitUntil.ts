import { Err, errAsync, ResultAsync } from "neverthrow";
import { Page } from "puppeteer";
import { BankhapoalimError, ErrorType } from "./BankhapoalimError";

export function waitUntil(
  asyncTest: () => Promise<any>,
  description = "",
  timeout = 10000,
  interval = 100
) {
  const promise = new Promise((resolve, reject) => {
    function wait() {
      asyncTest()
        .then((value) => {
          if (value === true) {
            resolve();
          } else {
            setTimeout(wait, interval);
          }
        })
        .catch(() => {
          reject();
        });
    }
    wait();
  });
  return timeoutPromise(timeout, promise, description);
}

function timeoutPromise(
  ms: number,
  promise: Promise<any>,
  description: string
) {
  const timeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      const error = new Error(description);
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeout]);
}

export async function getCurrentUrl(page: Page, clientSide = false) {
  if (clientSide) {
    return page.evaluate(() => window.location.href);
  }

  return page.url();
}

export async function waitForRedirect(
  page: Page,
  timeout = 15000,
  clientSide = false,
  ignoreList: string[] = []
): Promise<ResultAsync<void, BankhapoalimError>> {
  try {
    const initial = await getCurrentUrl(page, clientSide);

    await waitUntil(
      async () => {
        const current = await getCurrentUrl(page, clientSide);
        return current !== initial && !ignoreList.includes(current);
      },
      `waiting for redirect from ${initial}`,
      timeout,
      1000
    );
    return ResultAsync.fromPromise(Promise.resolve(),() => new BankhapoalimError("Can't connect to Bank Hapoalim website right now", ErrorType.NetworkError));
  } catch (e) {
    return errAsync(new BankhapoalimError(e.message, ErrorType.NetworkError));
  }
}
