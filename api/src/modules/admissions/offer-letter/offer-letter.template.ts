function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export interface OfferLetterData {
  applicant: {
    firstName: string;
    lastName: string;
    intendedClassLevel: string;
  };
  guardian: {
    firstName: string;
    lastName: string;
  };
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    primaryColor: string;
  };
  // Next term's resumption — use current-term start date as best available proxy
  // if no separate resumption date is configured.
  resumptionDate: Date;
}

export function renderOfferLetterHtml(data: OfferLetterData): string {
  const { applicant, guardian, school } = data;
  const fullName = `${escapeHtml(applicant.firstName)} ${escapeHtml(applicant.lastName)}`;
  const guardianName = `${escapeHtml(guardian.firstName)} ${escapeHtml(guardian.lastName)}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 28mm 22mm; }
  .header { text-align: center; border-bottom: 3px solid ${escapeHtml(school.primaryColor)}; padding-bottom: 12px; margin-bottom: 32px; }
  .header .logo { max-height: 64px; margin-bottom: 8px; }
  .header .school-name { font-size: 22px; font-weight: 700; color: ${escapeHtml(school.primaryColor)}; margin: 0; }
  .header .school-meta { font-size: 11px; color: #555; margin: 2px 0; }
  .title { text-align: center; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${escapeHtml(school.primaryColor)}; margin: 0 0 28px; }
  .body { font-size: 13px; line-height: 1.9; }
  .body p { margin: 0 0 16px; }
  .highlight { font-weight: 700; }
  .signature { margin-top: 56px; }
  .signature .block { font-size: 12px; }
  .signature .name { font-weight: 700; border-top: 1px solid #1a1a1a; padding-top: 4px; margin-top: 36px; min-width: 220px; display: inline-block; }
  .signature .label { color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer { margin-top: 40px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    ${school.logoUrl ? `<img class="logo" src="${escapeHtml(school.logoUrl)}" alt="" />` : ''}
    <p class="school-name">${escapeHtml(school.name)}</p>
    ${school.address ? `<p class="school-meta">${escapeHtml(school.address)}</p>` : ''}
  </div>

  <p class="title">Offer of Admission</p>

  <div class="body">
    <p>Dear <span class="highlight">${guardianName}</span>,</p>

    <p>We are pleased to inform you that your ward, <span class="highlight">${fullName}</span>,
    has been offered admission to <span class="highlight">${escapeHtml(school.name)}</span>
    for <span class="highlight">${escapeHtml(applicant.intendedClassLevel)}</span>.</p>

    <p>Please report to the school on or before <span class="highlight">${escapeHtml(formatDate(data.resumptionDate))}</span>
    with the following:</p>

    <ul>
      <li>Two recent passport photographs</li>
      <li>Original and photocopy of birth certificate</li>
      <li>Previous school's testimonial / transfer letter</li>
      <li>Evidence of payment of school fees (see Bursar's office)</li>
    </ul>

    <p>Please contact the school's front desk if you have any questions. We look forward to
    welcoming ${escapeHtml(applicant.firstName)} into our school community.</p>

    <p>Yours faithfully,</p>

    <div class="signature">
      <div class="block">
        <p class="name">The Principal</p>
        <p class="label">${escapeHtml(school.name)}</p>
      </div>
    </div>
  </div>

  <p class="footer">
    This offer is valid for the indicated resumption date only. Please notify the school immediately
    if you are unable to take up this offer.
  </p>
</body>
</html>`;
}
