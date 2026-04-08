/**
 * Email service — uses nodemailer with environment-configured SMTP.
 * Falls back to console logging when SMTP_HOST is not configured.
 *
 * Required env vars (optional — falls back to log-only mode):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const FROM = process.env.SMTP_FROM || "TaxWise AI <noreply@taxwise.ai>";

export interface TaxSubmissionEmailData {
  to: string;
  firstName: string | null;
  taxYear: number;
  filingStatus: string;
  confirmationNumber: string;
  totalWages: number;
  taxLiability: number;
  federalTaxWithheld: number;
  estimatedRefund: number;
  estimatedOwed: number;
  filedAt: string;
  wantsPrintCopy: boolean;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function buildEmailHtml(data: TaxSubmissionEmailData): string {
  const greeting = data.firstName ? `Hi ${data.firstName},` : "Hello,";
  const hasRefund = data.estimatedRefund > 0;
  const hasOwed = data.estimatedOwed > 0;

  const refundSection = hasRefund
    ? `
    <div style="background:#d1fae5;border-radius:8px;padding:20px;margin:20px 0;">
      <h2 style="margin:0 0 8px;color:#065f46;font-size:18px;">Estimated Refund</h2>
      <p style="margin:0;font-size:32px;font-weight:bold;color:#065f46;">
        ${formatCurrency(data.estimatedRefund)}
      </p>
      <p style="margin:8px 0 0;color:#065f46;font-size:14px;">
        Your refund will be deposited via direct deposit within <strong>21 days</strong>
        of IRS acceptance — typically faster for e-filed returns.
      </p>
    </div>`
    : "";

  const owedSection = hasOwed
    ? `
    <div style="background:#fef3c7;border-radius:8px;padding:20px;margin:20px 0;">
      <h2 style="margin:0 0 8px;color:#92400e;font-size:18px;">Amount Due</h2>
      <p style="margin:0;font-size:32px;font-weight:bold;color:#92400e;">
        ${formatCurrency(data.estimatedOwed)}
      </p>
      <p style="margin:8px 0 0;color:#92400e;font-size:14px;">
        Payment is due by <strong>April 15, ${data.taxYear + 1}</strong>. Pay via:
      </p>
      <ul style="margin:8px 0 0;color:#92400e;font-size:14px;">
        <li><strong>IRS Direct Pay</strong> — <a href="https://www.irs.gov/payments/direct-pay">irs.gov/payments/direct-pay</a> (free)</li>
        <li><strong>Credit/Debit Card</strong> — via an authorized IRS payment processor (fee applies)</li>
        <li><strong>Check or Money Order</strong> — payable to "U.S. Treasury", mail with Form 1040-V</li>
      </ul>
    </div>`
    : "";

  const printSection = data.wantsPrintCopy
    ? `
    <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#1e40af;font-size:14px;">
        📄 <strong>Paper Filing Option Selected</strong> — A PDF copy of your organized tax documents
        will be prepared and available for download in your TaxWise AI dashboard.
        Mail to the IRS address for your state (find it at
        <a href="https://www.irs.gov/filing/where-to-file-paper-tax-returns">irs.gov/filing/where-to-file-paper-tax-returns</a>).
      </p>
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#4f46e5;margin:0;font-size:24px;">TaxWise AI</h1>
    <p style="color:#6b7280;margin:4px 0 0;font-size:14px;">Tax Return Confirmation</p>
  </div>

  <p style="font-size:16px;">${greeting}</p>
  <p>Your <strong>${data.taxYear} federal tax return</strong> has been successfully submitted to the IRS.
     Here is your summary:</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <tr style="background:#f9fafb;">
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Confirmation Number</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${data.confirmationNumber}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Tax Year</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${data.taxYear}</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Filing Status</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${data.filingStatus.replace(/_/g, " ")}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Total Wages</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${formatCurrency(data.totalWages)}</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Federal Tax Withheld</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${formatCurrency(data.federalTaxWithheld)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">Tax Liability</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${formatCurrency(data.taxLiability)}</td>
    </tr>
    <tr style="background:#f9fafb;">
      <td style="padding:10px 12px;font-weight:600;">Filed At</td>
      <td style="padding:10px 12px;">${data.filedAt}</td>
    </tr>
  </table>

  ${refundSection}
  ${owedSection}
  ${printSection}

  <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;font-size:13px;color:#4b5563;">
    <p style="margin:0 0 8px;font-weight:600;">Track Your Return</p>
    <p style="margin:0;">You can check the status of your return approximately <strong>24 hours after filing</strong>
       using the IRS <a href="https://www.irs.gov/refunds">"Where's My Refund?"</a> tool at
       <a href="https://www.irs.gov/refunds">irs.gov/refunds</a>.
       Have your SSN, filing status, and exact refund amount ready.</p>
  </div>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#9ca3af;text-align:center;">
    This is an automated confirmation from TaxWise AI. Please retain this email for your records.
    TaxWise AI is not affiliated with the IRS.
  </p>
</body>
</html>`;
}

export async function sendTaxSubmissionEmail(data: TaxSubmissionEmailData): Promise<void> {
  const subject = `TaxWise AI — ${data.taxYear} Tax Return Submitted (${data.confirmationNumber})`;
  const html = buildEmailHtml(data);
  const text = `
TaxWise AI — ${data.taxYear} Tax Return Confirmation

Confirmation Number: ${data.confirmationNumber}
Tax Year: ${data.taxYear}
Filing Status: ${data.filingStatus}
Total Wages: ${formatCurrency(data.totalWages)}
Federal Tax Withheld: ${formatCurrency(data.federalTaxWithheld)}
${data.estimatedRefund > 0 ? `Estimated Refund: ${formatCurrency(data.estimatedRefund)}\nExpected within 21 days via direct deposit.` : ""}
${data.estimatedOwed > 0 ? `Amount Owed: ${formatCurrency(data.estimatedOwed)}\nPay by April 15 at irs.gov/payments/direct-pay` : ""}

Track your return at irs.gov/refunds approximately 24 hours after filing.
`.trim();

  const transporter = getTransporter();
  if (!transporter) {
    console.log("[email] SMTP not configured — logging email instead:");
    console.log(`  To: ${data.to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body preview: ${text.substring(0, 200)}...`);
    return;
  }

  await transporter.sendMail({ from: FROM, to: data.to, subject, html, text });
}
