import moment from "moment";
import puppeteer, { Browser, Page } from "puppeteer";
import { FetchData, FetchedAccountData } from "./fetchData";
import { getRestContext } from "./getRestContext";
import {
  ScrapedTransaction,
  Transaction,
  TransactionsAccount,
  TransactionStatuses,
  TransactionTypes,
} from "./transactions";

const BASE_URL = "https://login.bankhapoalim.co.il";
const DATE_FORMAT = "YYYYMMDD";

let browser: Browser;

export type ScrapingResult = {
  currentBalance:string,
  success: boolean,
  accounts: TransactionsAccount[],
}


const login = async (page: Page, { password, userCode }: Credentials) => {
  await page.goto(`${BASE_URL}/ng-portals/auth/he/?reqName=getLogonPage`);
  await page.waitForSelector("#userCode");
  await page.type("#userCode", userCode ?? "");
  await page.type("#password", password ?? "");
  await page.click(".login-btn");
};

const blockAssets = async (page: Page) => {
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (
      request.resourceType() === "image" ||
      request.resourceType() === "stylesheet" ||
      request.resourceType() === "media" ||
      request.resourceType() === "font"
    )
      request.abort();
    else request.continue();
  });
};

export const setup = async (headless:boolean) => {
  browser = await puppeteer.launch({ headless: headless });
};

export const close = async () => {
  await browser.close();
};

export const getAccountData = async (credentials: Credentials): Promise<ScrapingResult> => {
  const page = await browser.newPage();
  await blockAssets(page);
  await login(page, credentials);

  await page.waitForSelector(".currentBalance");

  const restContext = await getRestContext(page);
  const apiSiteUrl = `${BASE_URL}/${restContext}`;
  const accountDataUrl = `${BASE_URL}/ServerServices/general/accounts`;

  const accountsInfo =
    (await FetchData.fetchGetWithinPage<FetchedAccountData>(
      page,
      accountDataUrl
    )) || [];

  console.log(accountsInfo);

  const defaultStartMoment = moment().subtract(1, "years").add(1, "day");
  const startDate = defaultStartMoment.toDate();
  const startMoment = moment.max(defaultStartMoment, moment(startDate));

  const startDateStr = startMoment.format(DATE_FORMAT);
  const endDateStr = moment().format(DATE_FORMAT);

  const accounts: TransactionsAccount[] = [];

  for (
    let accountIndex = 0;
    accountIndex < accountsInfo.length;
    accountIndex += 1
  ) {
    const accountNumber = `${accountsInfo[accountIndex].bankNumber}-${accountsInfo[accountIndex].branchNumber}-${accountsInfo[accountIndex].accountNumber}`;
    const txnsUrl = `${apiSiteUrl}/current-account/transactions?accountId=${accountNumber}&numItemsPerPage=150&retrievalEndDate=${endDateStr}&retrievalStartDate=${startDateStr}&sortCode=1`;
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
  var currentBalance = await page.$eval(
    ".currentBalance",
    (el) => el.innerHTML
  );

  await page.close();

  const accountData:ScrapingResult = {
    currentBalance,
    success: true,
    accounts,
  };

  return accountData;
};

interface Credentials {
  userCode: string | null;
  password: string | null;
}

function convertTransactions(txns: ScrapedTransaction[]): Transaction[] {
  return txns.map((txn) => {
    const isOutbound = txn.eventActivityTypeCode === 2;

    let memo = "";
    if (txn.beneficiaryDetailsData) {
      const {
        partyHeadline,
        partyName,
        messageHeadline,
        messageDetail,
      } = txn.beneficiaryDetailsData;
      const memoLines: string[] = [];
      if (partyHeadline) {
        memoLines.push(partyHeadline);
      }

      if (partyName) {
        memoLines.push(`${partyName}.`);
      }

      if (messageHeadline) {
        memoLines.push(messageHeadline);
      }

      if (messageDetail) {
        memoLines.push(`${messageDetail}.`);
      }

      if (memoLines.length) {
        memo = memoLines.join(" ");
      }
    }

    const result: Transaction = {
      type: TransactionTypes.Normal,
      identifier: txn.referenceNumber,
      date: moment(txn.eventDate, DATE_FORMAT).toISOString(),
      processedDate: moment(txn.valueDate, DATE_FORMAT).toISOString(),
      originalAmount: isOutbound ? -txn.eventAmount : txn.eventAmount,
      originalCurrency: "ILS",
      chargedAmount: isOutbound ? -txn.eventAmount : txn.eventAmount,
      description: txn.activityDescription || "",
      status:
        txn.serialNumber === 0
          ? TransactionStatuses.Pending
          : TransactionStatuses.Completed,
      memo,
    };

    return result;
  });
}

