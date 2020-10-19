import moment from "moment";
export const DATE_FORMAT = "YYYYMMDD";

export function getTxnsUrl(
  apiSiteUrl: string,
  accountNumber: string,
  startDate?: Date
) {
  const defaultStartMoment = moment().subtract(1, "years").add(1, "day");
  if (!startDate) {
    startDate = defaultStartMoment.toDate();
  }
  const startMoment = moment.max(defaultStartMoment, moment(startDate));
  const startDateStr = startMoment.format(DATE_FORMAT);
  const endDateStr = moment().format(DATE_FORMAT);
  return `${apiSiteUrl}/current-account/transactions?accountId=${accountNumber}&numItemsPerPage=150&retrievalEndDate=${endDateStr}&retrievalStartDate=${startDateStr}&sortCode=1`;
}
