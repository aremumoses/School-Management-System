import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_SYSTEM_TEMPLATES } from '../src/modules/communication/templates/default-templates';

// Standalone script — runs outside Nest's DI container, so it builds its
// own PrismaClient the same way PrismaService does (driver adapter, see
// src/common/prisma/prisma.service.ts).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Same password for every seeded user, purely for local/manual testing —
// never used outside development.
const SEED_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // ---------------------------------------------------------------------
  // School (single row)
  // ---------------------------------------------------------------------
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Lagos Demo Secondary School',
        address: '12 Akin Adesola Street, Victoria Island, Lagos',
        registrationNumber: 'LSMOE/2010/0042',
        motto: 'Knowledge, Character, Excellence',
        documentPrimaryColor: '#1D4ED8',
        documentSecondaryColor: '#F59E0B',
        gradingScale: [
          { min: 75, max: 100, grade: 'A1', remark: 'Excellent' },
          { min: 70, max: 74, grade: 'B2', remark: 'Very Good' },
          { min: 65, max: 69, grade: 'B3', remark: 'Good' },
          { min: 60, max: 64, grade: 'C4', remark: 'Credit' },
          { min: 55, max: 59, grade: 'C5', remark: 'Credit' },
          { min: 50, max: 54, grade: 'C6', remark: 'Credit' },
          { min: 45, max: 49, grade: 'D7', remark: 'Pass' },
          { min: 40, max: 44, grade: 'E8', remark: 'Pass' },
          { min: 0, max: 39, grade: 'F9', remark: 'Fail' },
        ],
      },
    });
  }
  console.log(`School: ${school.name}`);

  // ---------------------------------------------------------------------
  // Academic session & terms
  // ---------------------------------------------------------------------
  const session = await prisma.academicSession.upsert({
    where: { name: '2025/2026' },
    update: {},
    create: { name: '2025/2026' },
  });

  const termDefs = [
    { name: 'First', startDate: '2025-09-15', endDate: '2025-12-12', isCurrent: false },
    { name: 'Second', startDate: '2026-01-12', endDate: '2026-04-03', isCurrent: false },
    { name: 'Third', startDate: '2026-04-20', endDate: '2026-07-24', isCurrent: true },
  ];
  const terms: { id: string; name: string; isCurrent: boolean }[] = [];
  for (const t of termDefs) {
    const term = await prisma.term.upsert({
      where: { sessionId_name: { sessionId: session.id, name: t.name } },
      update: { startDate: new Date(t.startDate), endDate: new Date(t.endDate), isCurrent: t.isCurrent },
      create: {
        sessionId: session.id,
        name: t.name,
        startDate: new Date(t.startDate),
        endDate: new Date(t.endDate),
        isCurrent: t.isCurrent,
      },
    });
    terms.push(term);
  }
  const currentTerm = terms.find((t) => t.isCurrent)!;
  console.log(`Session: ${session.name} (current term: ${currentTerm.name})`);

  // ---------------------------------------------------------------------
  // Classes & arms
  // ---------------------------------------------------------------------
  const classDefs = [
    { name: 'JSS1', level: 1, arms: ['Gold', 'Silver'] },
    { name: 'JSS2', level: 2, arms: ['Gold', 'Silver'] },
    { name: 'SSS1', level: 4, arms: ['Science', 'Arts'] },
  ];
  const arms: { id: string; name: string; classId: string; className: string }[] = [];
  const classes: { id: string; name: string }[] = [];
  for (const c of classDefs) {
    const klass = await prisma.class.upsert({
      where: { name: c.name },
      update: { level: c.level },
      create: { name: c.name, level: c.level },
    });
    classes.push(klass);
    for (const armName of c.arms) {
      const arm = await prisma.arm.upsert({
        where: { classId_name: { classId: klass.id, name: armName } },
        update: {},
        create: { classId: klass.id, name: armName },
      });
      arms.push({ ...arm, className: c.name });
    }
  }
  console.log(`Classes: ${classes.map((c) => c.name).join(', ')} (${arms.length} arms total)`);

  // ---------------------------------------------------------------------
  // Subjects + class-subject mapping (every subject offered in every class,
  // a reasonable simplification for seed data — real curriculum mapping is
  // a Stage 2 concern)
  // ---------------------------------------------------------------------
  const subjectNames = [
    'Mathematics',
    'English Language',
    'Basic Science',
    'Social Studies',
    'Civic Education',
    'Agricultural Science',
  ];
  const subjects: { id: string; name: string }[] = [];
  for (const name of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    subjects.push(subject);
    for (const klass of classes) {
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
        update: {},
        create: { classId: klass.id, subjectId: subject.id },
      });
    }
  }
  console.log(`Subjects: ${subjects.map((s) => s.name).join(', ')}`);

  // ---------------------------------------------------------------------
  // Staff — covers ADMIN, VICE_PRINCIPAL, SUBJECT_TEACHER (+ CLASS_TEACHER),
  // BURSAR, EXAM_OFFICER (at least Admin/Teacher/Bursar/Exam Officer per
  // the stage's seed requirement).
  // ---------------------------------------------------------------------
  const staffDefs: { firstName: string; lastName: string; email: string; roles: Role[] }[] = [
    { firstName: 'Adebayo', lastName: 'Ogunleye', email: 'admin@demoschool.ng', roles: [Role.ADMIN] },
    { firstName: 'Chinwe', lastName: 'Eze', email: 'vp@demoschool.ng', roles: [Role.VICE_PRINCIPAL] },
    {
      firstName: 'Tunde',
      lastName: 'Bakare',
      email: 'tunde.bakare@demoschool.ng',
      roles: [Role.SUBJECT_TEACHER, Role.CLASS_TEACHER],
    },
    { firstName: 'Ngozi', lastName: 'Okafor', email: 'ngozi.okafor@demoschool.ng', roles: [Role.SUBJECT_TEACHER] },
    { firstName: 'Funmilayo', lastName: 'Adeyemi', email: 'bursar@demoschool.ng', roles: [Role.BURSAR] },
    { firstName: 'Ibrahim', lastName: 'Suleiman', email: 'examofficer@demoschool.ng', roles: [Role.EXAM_OFFICER] },
  ];
  for (const s of staffDefs) {
    const staff = await prisma.staff.upsert({
      where: { email: s.email },
      update: {},
      create: {
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        passwordHash,
        employmentDate: new Date('2022-09-01'),
      },
    });
    for (const role of s.roles) {
      await prisma.staffRole.upsert({
        where: { staffId_role: { staffId: staff.id, role } },
        update: {},
        create: { staffId: staff.id, role },
      });
    }
  }
  console.log(`Staff: ${staffDefs.length} (${staffDefs.map((s) => s.roles.join('+')).join(', ')})`);

  // ---------------------------------------------------------------------
  // Students + guardians + enrollments — 20 students spread across arms,
  // each with one guardian and an active enrollment in the current term.
  // ---------------------------------------------------------------------
  const firstNamesM = ['Chukwuemeka', 'Oluwaseun', 'Abdullahi', 'Femi', 'Emeka', 'Kunle', 'Yusuf', 'Tobi', 'Chidi', 'Segun'];
  const firstNamesF = ['Chiamaka', 'Bisola', 'Aisha', 'Folake', 'Adaeze', 'Temitope', 'Zainab', 'Ifeoma', 'Bukola', 'Amara'];
  const lastNames = ['Adeyemi', 'Okonkwo', 'Mohammed', 'Balogun', 'Eze', 'Afolabi', 'Bello', 'Nwosu', 'Yusuf', 'Okafor', 'Ogundimu', 'Abubakar', 'Chukwu', 'Adesanya', 'Garba', 'Olawale', 'Ibekwe', 'Suleiman', 'Akintola', 'Nnamdi'];
  const relationships = ['Mother', 'Father', 'Guardian'];

  for (let i = 0; i < 20; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? firstNamesM[i % firstNamesM.length] : firstNamesF[i % firstNamesF.length];
    const lastName = lastNames[i % lastNames.length];
    const arm = arms[i % arms.length];
    const admissionNumber = `STU2025${String(i + 1).padStart(3, '0')}`;
    // Rough age-by-class-level: JSS1 ~10yo, JSS2 ~11yo, SSS1 ~14yo.
    const ageYears = arm.className === 'JSS1' ? 10 : arm.className === 'JSS2' ? 11 : 14;
    const dateOfBirth = new Date(2026 - ageYears, i % 12, (i % 27) + 1);

    const student = await prisma.student.upsert({
      where: { admissionNumber },
      update: {},
      create: {
        admissionNumber,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@students.demoschool.ng`,
        passwordHash,
        dateOfBirth,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
        stateOfOrigin: 'Lagos',
        lga: 'Eti-Osa',
        religion: i % 2 === 0 ? 'Christianity' : 'Islam',
        bloodGroup: ['O+', 'A+', 'B+', 'AB+'][i % 4],
        genotype: ['AA', 'AS'][i % 2],
        address: `${10 + i} Marina Road, Lagos`,
      },
    });

    const guardianEmail = `guardian.${admissionNumber.toLowerCase()}@example.com`;
    const guardian = await prisma.guardian.upsert({
      where: { email: guardianEmail },
      update: {},
      create: {
        firstName: `${lastName}`,
        lastName: 'Guardian',
        email: guardianEmail,
        phone: `+23480${String(10000000 + i).padStart(8, '0')}`,
        passwordHash,
      },
    });

    await prisma.studentGuardian.upsert({
      where: { studentId_guardianId: { studentId: student.id, guardianId: guardian.id } },
      update: {},
      create: {
        studentId: student.id,
        guardianId: guardian.id,
        relationship: relationships[i % relationships.length],
      },
    });

    await prisma.enrollment.upsert({
      where: { studentId_termId: { studentId: student.id, termId: currentTerm.id } },
      update: { classId: arm.classId, armId: arm.id },
      create: {
        studentId: student.id,
        classId: arm.classId,
        armId: arm.id,
        termId: currentTerm.id,
      },
    });
  }
  console.log('Students: 20 (each with 1 guardian + an active enrollment in the current term)');

  // ---------------------------------------------------------------------
  // Class Teacher + Subject Teacher assignments (current term) — without
  // these, CLASS_TEACHER/SUBJECT_TEACHER scoping never resolves to
  // anything when testing manually (no arm had a classTeacherId, and no
  // TeacherAssignment rows existed at all before Stage 4).
  // ---------------------------------------------------------------------
  const tunde = await prisma.staff.findUniqueOrThrow({
    where: { email: 'tunde.bakare@demoschool.ng' },
  });
  const ngozi = await prisma.staff.findUniqueOrThrow({
    where: { email: 'ngozi.okafor@demoschool.ng' },
  });
  const jss1Gold = arms.find((a) => a.className === 'JSS1' && a.name === 'Gold')!;
  const jss1 = classes.find((c) => c.name === 'JSS1')!;
  const mathematics = subjects.find((s) => s.name === 'Mathematics')!;
  const englishLanguage = subjects.find((s) => s.name === 'English Language')!;

  await prisma.arm.update({
    where: { id: jss1Gold.id },
    data: { classTeacherId: tunde.id },
  });

  // Every JSS1 subject gets an assigned teacher (split across tunde/ngozi)
  // so a full term-end cycle (Stage 5) can be exercised across "multiple
  // subjects/teachers" via real POST /scores/submit calls, not seeded
  // directly.
  const basicScience = subjects.find((s) => s.name === 'Basic Science')!;
  const socialStudies = subjects.find((s) => s.name === 'Social Studies')!;
  const civicEducation = subjects.find((s) => s.name === 'Civic Education')!;
  const agriculturalScience = subjects.find((s) => s.name === 'Agricultural Science')!;

  const jss1ClassSubjects = new Map<string, { id: string }>();
  for (const subject of [
    mathematics,
    englishLanguage,
    basicScience,
    socialStudies,
    civicEducation,
    agriculturalScience,
  ]) {
    const classSubject = await prisma.classSubject.findUniqueOrThrow({
      where: { classId_subjectId: { classId: jss1.id, subjectId: subject.id } },
    });
    jss1ClassSubjects.set(subject.name, classSubject);
  }

  const teacherBySubject: { subjectName: string; staffId: string }[] = [
    { subjectName: 'Mathematics', staffId: tunde.id },
    { subjectName: 'Basic Science', staffId: tunde.id },
    { subjectName: 'Civic Education', staffId: tunde.id },
    { subjectName: 'English Language', staffId: ngozi.id },
    { subjectName: 'Social Studies', staffId: ngozi.id },
    { subjectName: 'Agricultural Science', staffId: ngozi.id },
  ];
  for (const { subjectName, staffId } of teacherBySubject) {
    const classSubjectId = jss1ClassSubjects.get(subjectName)!.id;
    await prisma.teacherAssignment.upsert({
      where: {
        staffId_classSubjectId_termId: { staffId, classSubjectId, termId: currentTerm.id },
      },
      update: {},
      create: { staffId, classSubjectId, termId: currentTerm.id },
    });
  }
  console.log(
    `Class Teacher: ${tunde.firstName} ${tunde.lastName} -> JSS1 Gold. Subject Teachers assigned across all 6 JSS1 subjects (${teacherBySubject.length} assignments, current term).`,
  );

  // ---------------------------------------------------------------------
  // Stage 5 — Academics & Results Engine: the term's CA/Exam structure
  // (school-wide default, every subject uses it) — without this, no score
  // can be submitted (AssessmentService.assertReadyForSubmission requires
  // weights to sum to 100 first).
  // ---------------------------------------------------------------------
  const assessmentComponentDefs = [
    { name: 'CA1', maxScore: 10, weight: 10 },
    { name: 'CA2', maxScore: 10, weight: 10 },
    { name: 'CA3', maxScore: 10, weight: 10 },
    { name: 'Exam', maxScore: 70, weight: 70 },
  ];
  for (const c of assessmentComponentDefs) {
    // Prisma 7 rejects `null` inside a compound-unique `where` selector
    // (termId_subjectId_name), so the school-wide default rows (subjectId
    // null) have to be looked up with findFirst instead of upsert.
    const existing = await prisma.assessmentComponent.findFirst({
      where: { termId: currentTerm.id, subjectId: null, name: c.name },
    });
    if (existing) {
      await prisma.assessmentComponent.update({
        where: { id: existing.id },
        data: { maxScore: c.maxScore, weight: c.weight },
      });
    } else {
      await prisma.assessmentComponent.create({
        data: { termId: currentTerm.id, name: c.name, maxScore: c.maxScore, weight: c.weight },
      });
    }
  }
  console.log(
    `Assessment structure (current term, school-wide default): ${assessmentComponentDefs.map((c) => `${c.name}=${c.weight}%`).join(' + ')}`,
  );

  // ---------------------------------------------------------------------
  // Attendance — 15 weekdays of daily register for JSS1 Gold. STU2025007
  // is deliberately marked absent every other day so the
  // chronic-absenteeism endpoint has a real student to flag.
  // ---------------------------------------------------------------------
  const attendanceDates = [
    '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08',
    '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15',
    '2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22',
  ];
  const chronicAbsenteeAdmissionNumber = 'STU2025007';
  const jss1GoldEnrollments = await prisma.enrollment.findMany({
    where: { armId: jss1Gold.id, termId: currentTerm.id, status: 'ACTIVE' },
    select: { studentId: true, student: { select: { admissionNumber: true } } },
  });

  for (const enrollment of jss1GoldEnrollments) {
    const isChronicAbsentee =
      enrollment.student.admissionNumber === chronicAbsenteeAdmissionNumber;
    for (let d = 0; d < attendanceDates.length; d++) {
      const status = isChronicAbsentee
        ? d % 2 === 0
          ? 'ABSENT'
          : 'PRESENT'
        : d === 3
          ? 'LATE'
          : 'PRESENT';
      const date = new Date(attendanceDates[d]);
      const existing = await prisma.attendance.findFirst({
        where: { studentId: enrollment.studentId, date, classSubjectId: null },
      });
      if (existing) {
        await prisma.attendance.update({ where: { id: existing.id }, data: { status } });
      } else {
        await prisma.attendance.create({
          data: {
            studentId: enrollment.studentId,
            armId: jss1Gold.id,
            termId: currentTerm.id,
            date,
            status,
            markedByStaffId: tunde.id,
          },
        });
      }
    }
  }
  console.log(
    `Attendance: ${attendanceDates.length} school days seeded for JSS1 Gold (${chronicAbsenteeAdmissionNumber} deliberately marked chronically absent).`,
  );

  // ---------------------------------------------------------------------
  // Stage 6 — Fees & Payments: one fee structure per class for the current
  // term, so generate-invoices has something to bill from out of the box.
  // Invoices/payments are deliberately NOT seeded here — like Stage 5's
  // scores, they're exercised through real API calls, not pre-seeded
  // transactional data.
  // ---------------------------------------------------------------------
  const feeComponentDefsByLevel: Record<number, { name: string; amount: number; type: 'RECURRING' | 'ONE_OFF' | 'CONDITIONAL' }[]> = {
    1: [
      { name: 'Tuition', amount: 85000, type: 'RECURRING' },
      { name: 'PTA Levy', amount: 3000, type: 'RECURRING' },
      { name: 'Development Levy', amount: 5000, type: 'RECURRING' },
      { name: 'Examination Fee', amount: 4000, type: 'RECURRING' },
      { name: 'Sports Levy', amount: 2000, type: 'RECURRING' },
      { name: 'Admission Fee', amount: 15000, type: 'ONE_OFF' },
      { name: 'ID Card', amount: 1500, type: 'ONE_OFF' },
      { name: 'Transport', amount: 12000, type: 'CONDITIONAL' },
    ],
    2: [
      { name: 'Tuition', amount: 90000, type: 'RECURRING' },
      { name: 'PTA Levy', amount: 3000, type: 'RECURRING' },
      { name: 'Development Levy', amount: 5000, type: 'RECURRING' },
      { name: 'Examination Fee', amount: 4500, type: 'RECURRING' },
      { name: 'Sports Levy', amount: 2000, type: 'RECURRING' },
      { name: 'Admission Fee', amount: 15000, type: 'ONE_OFF' },
      { name: 'ID Card', amount: 1500, type: 'ONE_OFF' },
      { name: 'Transport', amount: 12000, type: 'CONDITIONAL' },
    ],
    4: [
      { name: 'Tuition', amount: 110000, type: 'RECURRING' },
      { name: 'PTA Levy', amount: 3500, type: 'RECURRING' },
      { name: 'Development Levy', amount: 6000, type: 'RECURRING' },
      { name: 'Examination Fee', amount: 7000, type: 'RECURRING' },
      { name: 'Sports Levy', amount: 2500, type: 'RECURRING' },
      { name: 'Admission Fee', amount: 20000, type: 'ONE_OFF' },
      { name: 'ID Card', amount: 1500, type: 'ONE_OFF' },
      { name: 'Transport', amount: 14000, type: 'CONDITIONAL' },
    ],
  };
  for (const klass of classes) {
    const level = classDefs.find((c) => c.name === klass.name)!.level;
    const componentDefs = feeComponentDefsByLevel[level];
    if (!componentDefs) continue;
    const structure = await prisma.feeStructure.upsert({
      where: { classId_termId: { classId: klass.id, termId: currentTerm.id } },
      update: {},
      create: { classId: klass.id, termId: currentTerm.id },
    });
    for (const c of componentDefs) {
      await prisma.feeComponent.upsert({
        where: { feeStructureId_name: { feeStructureId: structure.id, name: c.name } },
        update: { amount: c.amount, type: c.type },
        create: { feeStructureId: structure.id, name: c.name, amount: c.amount, type: c.type },
      });
    }
  }
  console.log(`Fee structures: ${classes.length} classes seeded for the current term.`);

  // ---------------------------------------------------------------------
  // Stage 7 — Communication: the system templates the absence-event
  // listener and fee-reminder cron look up by `key` (see
  // src/modules/communication/templates/default-templates.ts, the single
  // source of truth for these keys/bodies — kept in sync with that file,
  // not duplicated here). Without these existing, both triggers log an
  // error and silently skip sending rather than crash, but a real school
  // needs them seeded to actually receive anything.
  // ---------------------------------------------------------------------
  const admin = await prisma.staff.findUniqueOrThrow({
    where: { email: 'admin@demoschool.ng' },
  });
  for (const t of DEFAULT_SYSTEM_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: { key: t.key, name: t.name, body: t.body, createdByStaffId: admin.id },
    });
  }
  console.log(`Message templates: ${DEFAULT_SYSTEM_TEMPLATES.length} system templates seeded.`);

  console.log('\nSeed complete. Every seeded user shares the password:');
  console.log(`  ${SEED_PASSWORD}`);
  console.log('\nTry logging in as, e.g.:');
  console.log('  admin@demoschool.ng        (ADMIN)');
  console.log('  tunde.bakare@demoschool.ng (SUBJECT_TEACHER, CLASS_TEACHER)');
  console.log('  bursar@demoschool.ng       (BURSAR)');
  console.log('  guardian.stu2025001@example.com (PARENT)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
