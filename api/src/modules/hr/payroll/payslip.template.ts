export interface PayslipData {
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    motto: string | null;
    registrationNumber: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  staff: {
    firstName: string;
    lastName: string;
    email: string;
    department: string | null;
  };
  monthLabel: string;
  year: number;
  grossPay: number;
  payeDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  netPay: number;
  payslipNumber: string;
}

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

export function renderPayslipHtml(data: PayslipData): string {
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
  .net-pay { font-size: 18px; font-weight: 700; color: ${data.school.primaryColor}; }
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

  <p class="title">Payslip — ${escapeHtml(data.monthLabel)} ${data.year}</p>

  <div class="bio-grid">
    <div><span class="label">Payslip No.</span><span class="value">${escapeHtml(data.payslipNumber)}</span></div>
    <div><span class="label">Staff Name</span><span class="value">${escapeHtml(data.staff.firstName)} ${escapeHtml(data.staff.lastName)}</span></div>
    <div><span class="label">Email</span><span class="value">${escapeHtml(data.staff.email)}</span></div>
    <div><span class="label">Department</span><span class="value">${escapeHtml(data.staff.department) || '—'}</span></div>
  </div>

  <table>
    <thead><tr><th>Earnings</th><th class="right">Amount</th></tr></thead>
    <tbody>
      <tr><td><strong>Gross Pay</strong></td><td class="right"><strong>${naira(data.grossPay)}</strong></td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>Deductions</th><th class="right">Amount</th></tr></thead>
    <tbody>
      <tr><td>PAYE Tax</td><td class="right">${naira(data.payeDeduction)}</td></tr>
      <tr><td>Pension (Employee)</td><td class="right">${naira(data.pensionDeduction)}</td></tr>
      ${data.otherDeductions > 0 ? `<tr><td>Other Deductions</td><td class="right">${naira(data.otherDeductions)}</td></tr>` : ''}
    </tbody>
  </table>

  <table class="summary-table">
    <tbody>
      <tr><td>Net Pay</td><td class="right net-pay">${naira(data.netPay)}</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Confidential — for the named employee only</span>
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
</body>
</html>`;
}
