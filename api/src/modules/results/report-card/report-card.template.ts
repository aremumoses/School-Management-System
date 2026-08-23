import type { ReportCardData } from '../results.service';
import { CONDUCT_SCORE_LABELS } from '../conduct-categories';

function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function conductTable(
  title: string,
  ratings: { category: string; score: number }[],
): string {
  if (ratings.length === 0) {
    return `<div class="conduct-block"><h3>${escapeHtml(title)}</h3><p class="muted">No ratings recorded.</p></div>`;
  }
  const rows = ratings
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.category)}</td><td class="center">${r.score}</td><td class="center">${escapeHtml(CONDUCT_SCORE_LABELS[r.score] ?? '')}</td></tr>`,
    )
    .join('');
  return `
    <div class="conduct-block">
      <h3>${escapeHtml(title)}</h3>
      <table class="conduct-table">
        <thead><tr><th>Trait</th><th>Score (1-5)</th><th>Rating</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function renderReportCardHtml(data: ReportCardData): string {
  const subjectColumns = data.componentNames;

  const subjectRows = data.subjects
    .map((subject) => {
      const componentCells = subjectColumns
        .map((name) => {
          const match = subject.componentScores.find((c) => c.name === name);
          return `<td class="center">${match?.score ?? '-'}</td>`;
        })
        .join('');
      return `
        <tr>
          <td>${escapeHtml(subject.subjectName)}</td>
          ${componentCells}
          <td class="center"><strong>${fmt(subject.total)}</strong></td>
          <td class="center"><strong>${escapeHtml(subject.grade)}</strong></td>
          <td class="center">${ordinal(subject.positionInSubject)}</td>
          <td class="center">${fmt(subject.classAverageForSubject)}</td>
          <td>${escapeHtml(subject.remark)}</td>
        </tr>`;
    })
    .join('');

  const componentHeaders = subjectColumns
    .map((name) => `<th>${escapeHtml(name)}</th>`)
    .join('');

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
  .bio-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 100px; gap: 6px 16px; margin-bottom: 16px; align-items: start; }
  .bio-grid div span.label { color: #666; font-size: 10px; display: block; }
  .bio-grid div span.value { font-weight: 600; }
  .photo-box { width: 80px; height: 90px; border: 1px solid #ccc; object-fit: cover; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 11px; }
  th { background: ${data.school.primaryColor}; color: #fff; font-weight: 600; }
  td.center, th.center { text-align: center; }
  .summary-table td { font-weight: 600; }
  h3 { font-size: 12px; margin: 0 0 6px; color: ${data.school.primaryColor}; }
  .section { margin-bottom: 16px; }
  .conduct-row { display: flex; gap: 24px; }
  .conduct-block { flex: 1; }
  .conduct-table td, .conduct-table th { font-size: 10px; }
  .comment-box { border: 1px solid #ccc; padding: 8px; min-height: 40px; font-size: 11px; margin-bottom: 12px; }
  .comment-box .who { font-weight: 600; font-size: 10px; color: #666; margin-bottom: 4px; display: block; }
  .footer { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
  .muted { color: #888; }
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

  <p class="title">Terminal Report Card &mdash; ${escapeHtml(data.termName)} Term, ${escapeHtml(data.sessionName)}</p>

  <div class="bio-grid">
    <div><span class="label">Student Name</span><span class="value">${escapeHtml(data.student.firstName)} ${escapeHtml(data.student.lastName)}</span></div>
    <div><span class="label">Admission No.</span><span class="value">${escapeHtml(data.student.admissionNumber)}</span></div>
    <div><span class="label">Class</span><span class="value">${escapeHtml(data.className)} (${escapeHtml(data.armName)})</span></div>
    ${data.student.photoUrl ? `<img class="photo-box" src="${escapeHtml(data.student.photoUrl)}" />` : '<div class="photo-box"></div>'}
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        ${componentHeaders}
        <th>Total</th>
        <th>Grade</th>
        <th>Position</th>
        <th>Class Avg.</th>
        <th>Remark</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <table class="summary-table">
    <tbody>
      <tr>
        <td>Total Obtainable</td><td class="center">${fmt(data.totalObtainable)}</td>
        <td>Total Scored</td><td class="center">${fmt(data.totalScored)}</td>
        <td>Average</td><td class="center">${fmt(data.overallAverage)}%</td>
        <td>Position in Class</td><td class="center">${ordinal(data.overallPosition)} of ${data.classSize}</td>
      </tr>
    </tbody>
  </table>

  <div class="section">
    <h3>Attendance Summary</h3>
    <table class="summary-table">
      <tbody>
        <tr>
          <td>Days Present</td><td class="center">${data.attendance.presentDays}</td>
          <td>Days Absent</td><td class="center">${data.attendance.absentDays}</td>
          <td>Total School Days</td><td class="center">${data.attendance.totalDays}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section conduct-row">
    ${conductTable('Affective Domain', data.affectiveRatings)}
    ${conductTable('Psychomotor Domain', data.psychomotorRatings)}
  </div>

  <div class="section">
    <div class="comment-box"><span class="who">Form Teacher's Comment</span>${escapeHtml(data.formTeacherComment) || '<span class="muted">No comment yet.</span>'}</div>
    <div class="comment-box"><span class="who">Principal's Comment</span>${escapeHtml(data.principalComment) || '<span class="muted">No comment yet.</span>'}</div>
  </div>

  <div class="footer">
    <span>Next term resumes: ${data.nextTermResumptionDate ? escapeHtml(data.nextTermResumptionDate) : 'TBA'}</span>
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
</body>
</html>`;
}
