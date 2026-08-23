import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { IdCard } from '@/components/students/id-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { generateQrDataUrl } from '@/lib/qr-code';
import type { StudentDetailDto } from '@/lib/types/students';
import { AddressForm } from './address-form';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await auth();
  const studentId = session!.user.id;
  const student = await apiFetch<StudentDetailDto>(`/students/${studentId}`);
  const enrollment = student.enrollments[0];
  const qrDataUrl = student.qrToken ? await generateQrDataUrl(student.qrToken) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your school record. Most details are managed by the school office — you can update your home address yourself."
      />

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="size-16">
            {student.photoUrl && <AvatarImage src={student.photoUrl} alt="" />}
            <AvatarFallback className="text-lg">
              {student.firstName[0]}
              {student.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{student.admissionNumber}</p>
            {enrollment && (
              <Badge variant="outline" className="mt-1">
                {enrollment.class.name} {enrollment.arm.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digital ID</CardTitle>
        </CardHeader>
        <CardContent>
          <IdCard
            student={{
              firstName: student.firstName,
              lastName: student.lastName,
              admissionNumber: student.admissionNumber,
              photoUrl: student.photoUrl,
              className: enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : null,
            }}
            qrDataUrl={qrDataUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio Data</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field
            label="Date of Birth"
            value={new Date(student.dateOfBirth).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          />
          <Field label="Gender" value={student.gender === 'MALE' ? 'Male' : 'Female'} />
          <Field label="State of Origin" value={student.stateOfOrigin} />
          <Field label="LGA" value={student.lga} />
          <Field label="Religion" value={student.religion} />
          <Field label="Blood Group" value={student.bloodGroup} />
          <Field label="Genotype" value={student.genotype} />
          <Field label="Email" value={student.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Home Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm studentId={student.id} initialAddress={student.address} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardians</CardTitle>
        </CardHeader>
        <CardContent>
          {student.guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">No guardians on record.</p>
          ) : (
            <ul className="divide-y divide-border">
              {student.guardians.map((link) => (
                <li key={link.guardian.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {link.guardian.firstName} {link.guardian.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{link.relationship}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {link.guardian.phone ?? link.guardian.email ?? ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Guardian details are managed by the school office — speak to the front desk if
            something here is wrong.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
