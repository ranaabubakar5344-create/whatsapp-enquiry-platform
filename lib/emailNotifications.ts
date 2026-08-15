import { Resend } from "resend";

type NewEnquiryEmailInput = {
  conversationId: string;
  companyName: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  programmeName: string | null;
  country: string | null;
  chatUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeValue(
  value: string | null | undefined,
  fallback = "Not provided"
): string {
  const normalized = value?.trim();

  return normalized || fallback;
}

function getRecipients(): string[] {
  return (process.env.MARKETING_HEAD_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendNewEnquiryEmail(
  input: NewEnquiryEmailInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipients = getRecipients();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "Enquiry CRM <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      "New enquiry email skipped: RESEND_API_KEY is missing."
    );
    return;
  }

  if (recipients.length === 0) {
    console.warn(
      "New enquiry email skipped: MARKETING_HEAD_EMAIL is missing."
    );
    return;
  }

  const resend = new Resend(apiKey);

  const customerName = safeValue(
    input.customerName,
    "New Customer"
  );
  const customerPhone = safeValue(input.customerPhone);
  const customerEmail = safeValue(input.customerEmail);
  const programmeName = safeValue(input.programmeName);
  const country = safeValue(input.country);

  const subject = `New Website Enquiry - ${customerName}`;

  const text = [
    "New website enquiry received.",
    "",
    `Company: ${input.companyName}`,
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    `Email: ${customerEmail}`,
    `Programme: ${programmeName}`,
    `Country: ${country}`,
    "",
    "Open enquiry:",
    input.chatUrl,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px;color:#0f172a;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="background:#059669;padding:22px 26px;color:#ffffff;">
          <div style="font-size:13px;opacity:.9;">${escapeHtml(
            input.companyName
          )}</div>
          <h1 style="margin:6px 0 0;font-size:22px;">New Website Enquiry</h1>
        </div>

        <div style="padding:26px;">
          <p style="margin:0 0 20px;color:#475569;line-height:1.6;">
            A user has completed the website enquiry form and is ready for assistance.
          </p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:10px 0;color:#64748b;width:130px;">Name</td>
              <td style="padding:10px 0;font-weight:600;">${escapeHtml(
                customerName
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Phone</td>
              <td style="padding:10px 0;font-weight:600;">${escapeHtml(
                customerPhone
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Email</td>
              <td style="padding:10px 0;font-weight:600;">${escapeHtml(
                customerEmail
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Programme</td>
              <td style="padding:10px 0;font-weight:600;">${escapeHtml(
                programmeName
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748b;">Country</td>
              <td style="padding:10px 0;font-weight:600;">${escapeHtml(
                country
              )}</td>
            </tr>
          </table>

          <div style="margin-top:24px;">
            <a
              href="${escapeHtml(input.chatUrl)}"
              style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;"
            >
              Open Enquiry in CRM
            </a>
          </div>

          <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;">
            Conversation ID: ${escapeHtml(input.conversationId)}
          </p>
        </div>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(
      `Resend email failed: ${error.message}`
    );
  }

  console.log(
    "New enquiry email sent:",
    data?.id ?? "sent"
  );
}