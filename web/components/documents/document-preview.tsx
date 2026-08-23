import type { GeneratedDocumentType } from '@/lib/types/documents';
import type { Gender } from '@/lib/types/students';

interface PreviewStudent {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: Gender;
  className?: string | null;
}

/**
 * A plain-text mirror of api/src/modules/documents/document/document.template.ts
 * — the real PDF only renders *after* Admin approval (so its signature
 * block can correctly show who approved it), so there's no rendered file
 * to preview at DRAFT time. This reproduces the same wording client-side
 * so the approval queue still gets a meaningful "preview before approving"
 * instead of nothing.
 */
export function DocumentPreview({
  type,
  student,
}: {
  type: GeneratedDocumentType;
  student: PreviewStudent;
}) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const pronoun = student.gender === 'MALE' ? 'He' : 'She';
  const possessive = student.gender === 'MALE' ? 'his' : 'her';
  const reflexive = student.gender === 'MALE' ? 'himself' : 'herself';

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-5 font-serif text-sm leading-relaxed text-foreground">
      <p className="text-center text-xs font-sans uppercase tracking-wide text-muted-foreground">
        Preview — not yet signed
      </p>
      <p className="text-center text-base font-bold uppercase tracking-wide">
        {type === 'TESTIMONIAL' ? 'Testimonial' : 'Certificate'}
      </p>

      {type === 'TESTIMONIAL' ? (
        <>
          <p>
            This is to certify that <strong>{fullName}</strong> (Admission Number:{' '}
            {student.admissionNumber}){student.className ? ` of ${student.className}` : ''} was a
            student of this school.
          </p>
          <p>
            During {possessive} time here, {pronoun.toLowerCase()} conducted {reflexive} in a manner
            consistent with the school&apos;s values, and {pronoun.toLowerCase()} is found to be of
            good character and sound conduct.
          </p>
          <p>
            We recommend {student.firstName} to any institution or organization {possessive} may seek
            to join, and wish {possessive === 'his' ? 'him' : 'her'} every success in future
            endeavors.
          </p>
        </>
      ) : (
        <>
          <p className="text-center">This is to certify that</p>
          <p className="text-center text-lg font-bold italic">{fullName}</p>
          <p className="text-center">
            Admission Number: {student.admissionNumber}
            {student.className ? ` · ${student.className}` : ''}
          </p>
          <p className="text-center">
            has been a student in good standing at this institution, and this certificate is issued in
            recognition thereof.
          </p>
        </>
      )}

      <p className="border-t border-border pt-3 text-center font-sans text-xs text-muted-foreground">
        Date issued and approving signatory will be recorded once an Admin approves this document.
      </p>
    </div>
  );
}
