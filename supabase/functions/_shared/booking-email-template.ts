export type NotificationEmailPayload = {
  title: string;
  body: string | null;
  actionUrl: string;
  metadata: Record<string, unknown> | null;
};

export type BookingApprovalEmailDetails = {
  bookingReference?: string;
  venueName?: string;
  eventDate?: string;
  eventTime?: string;
  guestCount?: number;
  totalAmount?: number;
  depositAmount?: number;
  autoApproved?: boolean;
};

export type RenderedEmail = {
  html: string;
  text: string;
};

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function formatCurrency(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatTime(value: string | undefined) {
  if (!value) return null;
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function detailRow(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:8px 0;color:#667085;font-size:14px;width:42%;vertical-align:top">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 0;color:#18231d;font-size:14px;font-weight:700;text-align:right;vertical-align:top">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function emailShell(content: string, previewText: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Venora</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f1ea">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
      ${escapeHtml(previewText)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1ea">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(24,35,29,.10)">
            <tr>
              <td style="background:#173f35;padding:26px 36px">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:.5px;color:#ffffff">
                  Venora
                </div>
                <div style="font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c9d8d1;margin-top:4px">
                  Memorable events, beautifully arranged
                </div>
              </td>
            </tr>
            ${content}
            <tr>
              <td style="padding:24px 36px;background:#fbfaf7;border-top:1px solid #ece8df;font-family:Arial,sans-serif;color:#667085;font-size:12px;line-height:1.6">
                This is a transactional booking update from Venora. For your security,
                open Venora directly if you do not recognize this request.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderApprovalEmail(
  payload: NotificationEmailPayload,
  details: BookingApprovalEmailDetails,
): RenderedEmail {
  const eventDate = formatDate(details.eventDate);
  const eventTime = formatTime(details.eventTime);
  const totalAmount = formatCurrency(details.totalAmount);
  const depositAmount = formatCurrency(details.depositAmount);
  const approvalLabel = details.autoApproved
    ? "Approved instantly"
    : "Booking approved";
  const venueName = details.venueName ?? "Your selected venue";
  const body = payload.body ??
    "Your venue request has been approved. Review the details and complete any required deposit.";

  const content = `
    <tr>
      <td style="padding:38px 36px 18px;font-family:Arial,sans-serif">
        <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e6f4ed;color:#176147;font-size:12px;font-weight:800;letter-spacing:.7px;text-transform:uppercase">
          ${escapeHtml(approvalLabel)}
        </span>
        <h1 style="margin:18px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;color:#18231d">
          Your venue said yes.
        </h1>
        <p style="margin:0;color:#475467;font-size:16px;line-height:1.7">
          ${escapeHtml(body)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 36px 8px;font-family:Arial,sans-serif">
        <div style="border:1px solid #e3ded3;border-radius:14px;padding:20px;background:#fbfaf7">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#18231d;margin-bottom:8px">
            ${escapeHtml(venueName)}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${detailRow("Event date", eventDate)}
            ${detailRow("Start time", eventTime)}
            ${
    detailRow(
      "Guests",
      details.guestCount ? String(details.guestCount) : null,
    )
  }
            ${detailRow("Booking reference", details.bookingReference)}
            ${detailRow("Booking total", totalAmount)}
            ${detailRow("Deposit due", depositAmount)}
          </table>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 36px 38px;font-family:Arial,sans-serif">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius:10px;background:#d79b52">
              <a href="${
    escapeHtml(payload.actionUrl)
  }" style="display:inline-block;padding:14px 24px;color:#18231d;font-size:15px;font-weight:800;text-decoration:none">
                View booking and payment
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#667085;font-size:13px;line-height:1.6">
          Your reservation is secured according to the payment terms shown in
          your booking. Pricing and availability remain protected by Venora's
          booking rules.
        </p>
      </td>
    </tr>
  `;

  const textDetails = [
    `Venue: ${venueName}`,
    eventDate ? `Event date: ${eventDate}` : null,
    eventTime ? `Start time: ${eventTime}` : null,
    details.guestCount ? `Guests: ${details.guestCount}` : null,
    details.bookingReference
      ? `Booking reference: ${details.bookingReference}`
      : null,
    totalAmount ? `Booking total: ${totalAmount}` : null,
    depositAmount ? `Deposit due: ${depositAmount}` : null,
  ].filter(Boolean);

  return {
    html: emailShell(content, `${venueName} approved your booking request.`),
    text: [
      payload.title,
      "",
      body,
      "",
      ...textDetails,
      "",
      `View booking and payment: ${payload.actionUrl}`,
      "",
      "This is a transactional booking update from Venora.",
    ].join("\n"),
  };
}

function renderGenericEmail(payload: NotificationEmailPayload): RenderedEmail {
  const body = payload.body ?? "You have a new update from Venora.";
  const content = `
    <tr>
      <td style="padding:38px 36px;font-family:Arial,sans-serif">
        <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#18231d">
          ${escapeHtml(payload.title)}
        </h1>
        <p style="margin:0 0 24px;color:#475467;font-size:16px;line-height:1.7">
          ${escapeHtml(body)}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius:10px;background:#d79b52">
              <a href="${
    escapeHtml(payload.actionUrl)
  }" style="display:inline-block;padding:14px 24px;color:#18231d;font-size:15px;font-weight:800;text-decoration:none">
                Open in Venora
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return {
    html: emailShell(content, body),
    text: [
      payload.title,
      "",
      body,
      "",
      `Open in Venora: ${payload.actionUrl}`,
    ].join("\n"),
  };
}

export function renderNotificationEmail(
  payload: NotificationEmailPayload,
  approvalDetails?: BookingApprovalEmailDetails | null,
): RenderedEmail {
  if (payload.metadata?.status === "approved") {
    return renderApprovalEmail(payload, approvalDetails ?? {});
  }
  return renderGenericEmail(payload);
}
