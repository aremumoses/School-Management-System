import type { DocumentRenderData } from '../documents.service';

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

function shell(data: DocumentRenderData, title: string, body: string): string {
  const { school } = data;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 28mm 22mm; }
  .header { text-align: center; border-bottom: 3px solid ${school.primaryColor}; padding-bottom: 12px; margin-bottom: 28px; }
  .header .logo { max-height: 64px; margin-bottom: 8px; }
  .header .school-name { font-size: 22px; font-weight: 700; color: ${school.primaryColor}; margin: 0; }
  .header .school-meta { font-size: 11px; color: #555; margin: 2px 0; }
  .title { text-align: center; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${school.secondaryColor}; margin: 0 0 24px; }
  .body { font-size: 13px; line-height: 1.9; text-align: justify; }
  .body p { margin: 0 0 16px; }
  .signature { margin-top: 56px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature .block { font-size: 12px; }
  .signature .name { font-weight: 700; border-top: 1px solid #1a1a1a; padding-top: 4px; margin-top: 36px; min-width: 220px; }
  .signature .label { color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer { margin-top: 40px; font-size: 9px; color: #999; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    ${school.logoUrl ? `<img class="logo" src="${escapeHtml(school.logoUrl)}" />` : ''}
    <p class="school-name">${escapeHtml(school.name)}</p>
    ${school.address ? `<p class="school-meta">${escapeHtml(school.address)}</p>` : ''}
    <p class="school-meta">
      ${school.motto ? `"${escapeHtml(school.motto)}"` : ''}
      ${school.registrationNumber ? ` &middot; Reg. No: ${escapeHtml(school.registrationNumber)}` : ''}
    </p>
  </div>
  <p class="title">${escapeHtml(title)}</p>
  <div class="body">${body}</div>
  <div class="signature">
    <div class="block">
      <p class="label">Date Issued</p>
      <p>${formatDate(data.approvedAt)}</p>
    </div>
    <div class="block">
      <p class="name">${escapeHtml(data.approvedByName)}</p>
      <p class="label">Approved &amp; Signed</p>
    </div>
  </div>
  <p class="footer">This document was generated electronically and is valid without a handwritten signature.</p>
</body>
</html>`;
}

function renderTestimonialHtml(data: DocumentRenderData): string {
  const { student } = data;
  const fullName = `${student.firstName} ${student.lastName}`;
  const pronoun = student.gender === 'MALE' ? 'He' : 'She';
  const possessive = student.gender === 'MALE' ? 'his' : 'her';

  const body = `
    <p>This is to certify that <strong>${escapeHtml(fullName)}</strong> (Admission Number: ${escapeHtml(student.admissionNumber)})${data.className ? ` of ${escapeHtml(data.className)}` : ''} was a student of this school.</p>
    <p>During ${possessive} time here, ${pronoun.toLowerCase()} conducted ${possessive === 'his' ? 'himself' : 'herself'} in a manner consistent with the school's values, and ${pronoun.toLowerCase()} is found to be of good character and sound conduct.</p>
    <p>We recommend ${fullName.split(' ')[0]} to any institution or organization ${possessive} may seek to join, and wish ${possessive === 'his' ? 'him' : 'her'} every success in future endeavors.</p>
  `;

  return shell(data, 'Testimonial', body);
}

function renderCertificateHtml(data: DocumentRenderData): string {
  const { student } = data;
  const fullName = `${student.firstName} ${student.lastName}`;

  const body = `
    <p style="text-align: center; font-size: 15px; margin-bottom: 24px;">This is to certify that</p>
    <p style="text-align: center; font-size: 22px; font-weight: 700; font-style: italic; margin-bottom: 24px;">${escapeHtml(fullName)}</p>
    <p style="text-align: center;">Admission Number: ${escapeHtml(student.admissionNumber)}${data.className ? ` &middot; ${escapeHtml(data.className)}` : ''}</p>
    <p style="text-align: center; margin-top: 24px;">has been a student in good standing at this institution, and this certificate is issued in recognition thereof.</p>
  `;

  return shell(data, 'Certificate', body);
}

export function renderDocumentHtml(data: DocumentRenderData): string {
  return data.document.type === 'TESTIMONIAL'
    ? renderTestimonialHtml(data)
    : renderCertificateHtml(data);
}
