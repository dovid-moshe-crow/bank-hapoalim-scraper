import { Page } from "puppeteer";
import { v4 as uuid4 } from "uuid";

export type FetchedAccountData = {
  bankNumber: string;
  accountNumber: string;
  branchNumber: string;
}[];

export type FetchedAccountTransactionsData = {
    transactions: ScrapedTransaction[];
  };
  
  interface ScrapedTransaction {
    serialNumber?: number;
    activityDescription?: string;
    eventAmount: number;
    valueDate?: string;
    eventDate?: string;
    referenceNumber?: number;
    ScrapedTransaction?: string;
    eventActivityTypeCode: number;
    beneficiaryDetailsData?: {
      partyHeadline?: string;
      partyName?: string;
      messageHeadline?: string;
      messageDetail?: string;
    };
  }
  

export class FetchData {
  static async fetchGetWithinPage<TResult>(
    page: Page,
    url: string
  ): Promise<TResult | null> {
    return page.evaluate((url) => {
      return new Promise<TResult | null>((resolve, reject) => {
        fetch(url, {
          credentials: "include",
        })
          .then((result) => {
            if (result.status === 204) {
              resolve(null);
            } else {
              resolve(result.json());
            }
          })
          .catch((e) => {
            reject(e);
          });
      });
    }, url);
  }

  static async fetchPoalimXSRFWithinPage(
    page: Page,
    url: string,
    pageUuid: string
  ): Promise<FetchedAccountTransactionsData | null> {
    const cookies = await page.cookies();
    const XSRFCookie = cookies.find((cookie) => cookie.name === "XSRF-TOKEN");
    const headers: Record<string, any> = {};
    if (XSRFCookie != null) {
      headers["X-XSRF-TOKEN"] = XSRFCookie.value;
    }
    headers.pageUuid = pageUuid;
    headers.uuid = uuid4();
    headers["Content-Type"] = "application/json;charset=UTF-8";
    return this.fetchPostWithinPage<FetchedAccountTransactionsData>(
      page,
      url,
      [],
      headers
    );
  }

  static async fetchPostWithinPage<TResult>(
    page: Page,
    url: string,
    data: Record<string, any>,
    extraHeaders: Record<string, any> = {}
  ): Promise<TResult | null> {
    return page.evaluate<(...args: any[]) => Promise<TResult | null>>(
      (
        url: string,
        data: Record<string, any>,
        extraHeaders: Record<string, any>
      ) => {
        return new Promise((resolve, reject) => {
          fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            credentials: "include",
            // eslint-disable-next-line prefer-object-spread
            headers: Object.assign(
              {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              },
              extraHeaders
            ),
          })
            .then((result) => {
              if (result.status === 204) {
                // No content response
                resolve(null);
              } else {
                resolve(result.json());
              }
            })
            .catch((e) => {
              reject(e);
            });
        });
      },
      url,
      data,
      extraHeaders
    );
  }
}
