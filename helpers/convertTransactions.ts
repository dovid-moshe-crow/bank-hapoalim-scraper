import moment from "moment";
import {
  ScrapedTransaction,
  Transaction,
  TransactionStatuses,
  TransactionTypes
} from "../transactions";
const DATE_FORMAT = "YYYYMMDD";

export function convertTransactions(txns: ScrapedTransaction[]): Transaction[] {
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
      status: txn.serialNumber === 0
        ? TransactionStatuses.Pending
        : TransactionStatuses.Completed,
      memo,
    };

    return result;
  });
}
