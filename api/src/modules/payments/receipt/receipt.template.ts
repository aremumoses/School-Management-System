import type { ReceiptData } from '../payments.service';

function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  PAYSTACK: 'Online (Paystack)',
};

export function renderReceiptHtml(data: ReceiptData): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 32px;
    font-size: 12px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 3px solid ${data.school.primaryColor};
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .header img.logo { width: 64px; height: 64px; object-fit: contain; }
  .header .school-name { font-size: 22px; font-weight: 700; color: ${data.school.primaryColor}; margin: 0; }
  .header .school-meta { font-size: 11px; color: #444; margin: 2px 0 0; }
  .title { text-align: center; font-size: 16px; font-weight: 700; margin: 8px 0 16px; text-transform: uppercase; letter-spacing: 0.5px; color: ${data.school.secondaryColor}; }
  .bio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-bottom: 16px; }
  .bio-grid div span.label { color: #666; font-size: 10px; display: block; }
  .bio-grid div span.value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
  th { background: ${data.school.primaryColor}; color: #fff; font-weight: 600; }
  td.right, th.right { text-align: right; }
  .amount-paid { font-size: 18px; font-weight: 700; color: ${data.school.primaryColor}; }
  .summary-table td { font-weight: 600; }
  .footer { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 24px; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    ${data.school.logoUrl ? `<img class="logo" src="${escapeHtml(data.school.logoUrl)}" />` : ''}
    <div>
      <p class="school-name">${escapeHtml(data.school.name)}</p>
      ${data.school.address ? `<p class="school-meta">${escapeHtml(data.school.address)}</p>` : ''}
      <p class="school-meta">
        ${data.school.motto ? `"${escapeHtml(data.school.motto)}"` : ''}
        ${data.school.registrationNumber ? ` &middot; Reg. No: ${escapeHtml(data.school.registrationNumber)}` : ''}
      </p>
    </div>
  </div>

  <p class="title">Payment Receipt</p>

  <div class="bio-grid">
    <div><span class="label">Receipt No.</span><span class="value">${escapeHtml(data.receiptNumber)}</span></div>
    <div><span class="label">Date</span><span class="value">${new Date(data.paidAt).toLocaleString('en-NG')}</span></div>
    <div><span class="label">Student Name</span><span class="value">${escapeHtml(data.student.firstName)} ${escapeHtml(data.student.lastName)}</span></div>
    <div><span class="label">Admission No.</span><span class="value">${escapeHtml(data.student.admissionNumber)}</span></div>
    <div><span class="label">Term / Session</span><span class="value">${escapeHtml(data.termName)} Term, ${escapeHtml(data.sessionName)}</span></div>
    <div><span class="label">For</span><span class="value">${escapeHtml(data.invoiceDescription)}</span></div>
  </div>

  <table>
    <thead><tr><th>Payment Method</th><th>Reference</th><th class="right">Amount Paid</th></tr></thead>
    <tbody>
      <tr>
        <td>${escapeHtml(METHOD_LABELS[data.method] ?? data.method)}</td>
        <td>${escapeHtml(data.reference)}</td>
        <td class="right amount-paid">${naira(data.amount)}</td>
      </tr>
    </tbody>
  </table>

  <table class="summary-table">
    <tbody>
      <tr><td>Invoice Subtotal</td><td class="right">${naira(data.invoiceSubtotal)}</td></tr>
      ${data.invoiceDiscountTotal > 0 ? `<tr><td>Discounts</td><td class="right">-${naira(data.invoiceDiscountTotal)}</td></tr>` : ''}
      <tr><td>Net Payable</td><td class="right">${naira(data.invoiceNetPayable)}</td></tr>
      <tr><td>Total Paid to Date</td><td class="right">${naira(data.invoiceAmountPaid)}</td></tr>
      <tr><td>Running Balance</td><td class="right">${naira(Math.max(0, data.invoiceBalance))}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <span>${data.recordedByName ? `Recorded by: ${escapeHtml(data.recordedByName)}` : 'Confirmed via online payment'}</span>
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
</body>
</html>`;
}
