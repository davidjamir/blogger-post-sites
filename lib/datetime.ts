const DISPLAY_TZ = "Asia/Ho_Chi_Minh";

/** Hiển thị ngày giờ theo UTC+7 (Việt Nam). Dùng cho UI; DB vẫn lưu `Date` tuyệt đối. */
export function formatDateTimeDisplayUtc7(
  d: Date | string | number | undefined
): string {
  if (d == null) {
    return "";
  }
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) {
    return String(d);
  }
  return date.toLocaleString("vi-VN", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
