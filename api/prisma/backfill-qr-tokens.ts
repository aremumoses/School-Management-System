import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// One-off backfill for students created before Stage 29 added
// Student.qrToken (new students get one at creation — see
// StudentsService.createStudent). Safe to re-run: only ever touches rows
// where qrToken is still null. Standalone script, same PrismaClient setup
// as seed.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const students = await prisma.student.findMany({
    where: { qrToken: null },
    select: { id: true },
  });

  for (const student of students) {
    await prisma.student.update({
      where: { id: student.id },
      data: { qrToken: randomUUID() },
    });
  }

  console.log(`Backfilled qrToken for ${students.length} student(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
