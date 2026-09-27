export const EMAIL_STATUS_LABEL: Record<string, string> = {
  ordered: "Order confirmed",
  dispatched: "Dispatched",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled by supplier",
  unknown: "Not sure",
};

export const emailDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
