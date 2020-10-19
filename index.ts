import puppeteer, { Browser, Page } from "puppeteer";
import { convertTransactions } from "./helpers/convertTransactions";
import { FetchData, FetchedAccountData } from "./fetchData";
import { ok, err, ResultAsync, errAsync, Err } from "neverthrow";
import { getRestContext } from "./getRestContext";
import { Transaction, TransactionsAccount } from "./transactions";
import { waitForRedirect } from "./waitUntil";
import { getTxnsUrl } from "./helpers/getTxnsUrl";
import { blockAssets } from "./helpers/blockAssets";
import { BankhapoalimError, ErrorType } from "./BankhapoalimError";

const BASE_URL = "https://login.bankhapoalim.co.il";

let browser: Browser;

export type ScrapingResult = {
  currentBalance?: string;
  success: boolean;
  accounts?: TransactionsAccount[];
  errorMessage?: string;
  errorType?: ErrorType;
};

export interface Credentials {
  userCode: string | null;
  password: string | null;
}

async function getCurrentBalance(
  page: Page
): Promise<ResultAsync<string, BankhapoalimError>> {
  try {
    await page.waitForSelector(".currentBalance", { timeout: 10000 });
    return await ResultAsync.fromPromise(
      page.$eval(".currentBalance", (el) => el.innerHTML),
      () => new BankhapoalimError("Could't get current balance",ErrorType.GeneralError)
    );
  } catch (e) {
    return errAsync(new BankhapoalimError(e.message, ErrorType.GeneralError));
  }
}

const getTransactionsAccount = async (page: Page): Promise<ResultAsync<TransactionsAccount[], BankhapoalimError>> => {
  try {
    const restContext = await getRestContext(page);
    const apiSiteUrl = `${BASE_URL}/${restContext}`;

    const accountDataUrl = `${BASE_URL}/ServerServices/general/accounts`;

    const accountsInfo =
      (await FetchData.fetchGetWithinPage<FetchedAccountData>(
        page,
        accountDataUrl
      )) || [];

    const accounts: TransactionsAccount[] = [];

    for (
      let accountIndex = 0;
      accountIndex < accountsInfo.length;
      accountIndex += 1
    ) {
      const accountNumber = `${accountsInfo[accountIndex].bankNumber}-${accountsInfo[accountIndex].branchNumber}-${accountsInfo[accountIndex].accountNumber}`;
      const txnsUrl = getTxnsUrl(apiSiteUrl, accountNumber);
      const txnsResult = await FetchData.fetchPoalimXSRFWithinPage(
        page,
        txnsUrl,
        "/current-account/transactions"
      );
      let txns: Transaction[] = [];
      if (txnsResult) {
        txns = convertTransactions(txnsResult.transactions);
      }

      accounts.push({
        accountNumber,
        txns,
      });
    }

    return ResultAsync.fromPromise((async () => accounts)(),() => new BankhapoalimError("Could't get Transactions", ErrorType.GeneralError));
  } catch (e) {
    return errAsync(new BankhapoalimError(e.message, ErrorType.GeneralError));
  }
};

async function login(
  page: Page,
  { password, userCode }: Credentials
): Promise<ResultAsync<void, BankhapoalimError>> {
  try {
    await page.goto(`${BASE_URL}/ng-portals/auth/he/?reqName=getLogonPage`);
    await page.waitForSelector("#userCode");
    await page.type("#userCode", userCode ?? "");
    await page.type("#password", password ?? "");
    await page.click(".login-btn");
    return ResultAsync.fromPromise(Promise.resolve(),() => new BankhapoalimError("Can't Login to Bank Hapoalim", ErrorType.GeneralError));
  } catch (e) {
    return errAsync(new BankhapoalimError(e.message, ErrorType.GeneralError));
  }
}

export async function getAccountData(
  credentials: Credentials
): Promise<ScrapingResult> {
  const page = await browser.newPage();
  await blockAssets(page);

  try {
    const loginResult = await login(page, credentials);
    if (loginResult.isErr()) {
      throw loginResult.error;
    }
    const redirect = await waitForRedirect(page);

    if (redirect.isErr()) {
      throw redirect.error;
    }
    
    const accounts = await getTransactionsAccount(page);
   
    if (accounts.isErr()) {
      throw accounts.error;
    }
    const currentBalanceRes = await getCurrentBalance(page);
    let currentBalance = "";
    if (currentBalanceRes.isOk()) {
      currentBalance = currentBalanceRes.value;
    }
    return {
      currentBalance,
      success: true,
      accounts: accounts.value,
    };
  } catch (e) {
    const err: BankhapoalimError = e;
    console.log(err.name);
    return {
      success: false,
      errorMessage: err.message,
      errorType: err.errorType,
    };
  } finally {
    await page.close();
  }
}

export async function setup(headless: boolean) {
  browser = await puppeteer.launch({ headless: headless });
}

export async function close() {
  await browser.close();
}
