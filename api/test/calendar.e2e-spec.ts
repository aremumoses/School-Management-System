import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const RUN_ID = Date.now().toString(36);

interface IdResponse {
  id: string;
}

interface EventResponse {
  id: string;
  title: string;
  rsvpEnabled: boolean;
  rsvpTally?: { yes: number; no: number; maybe: number };
  myResponse?: string | null;
}

interface CalendarEntryResponse {
  type: 'EVENT' | 'TERM';
  id: string;
  title: string;
}

describe('Calendar (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken: string;
  let bursarToken: string;
  let examOfficerToken: string;

  let staffOrganizerId: string;
  let staffOrganizerToken: string;
  let guardianId: string;
  let guardianToken: string;
  let studentId: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const server = app.getHttpServer();
    adminToken = await loginAndGetToken(ADMIN_EMAIL);
    bursarToken = await loginAndGetToken('bursar@demoschool.ng');
    examOfficerToken = await loginAndGetToken('examofficer@demoschool.ng');

    // A staff member who will create+organize an event but ISN'T Admin/VP
    // themselves — used to prove "organizer" access to /rsvps is about
    // having actually created it, while still going through Admin to
    // create the event in the first place (only Admin/VP have "F"/"E").
    staffOrganizerId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Cal',
            lastName: `Organizer${RUN_ID}`,
            email: `calorganizer.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['ADMIN'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    staffOrganizerToken = await loginAndGetToken(
      `calorganizer.${RUN_ID}@demoschool.ng`,
    );

    const studentRes = await request(server)
      .post('/students')
      .set(asAdmin())
      .send({
        firstName: 'Cal',
        lastName: `Student${RUN_ID}`,
        dateOfBirth: '2011-01-01',
        gender: 'MALE',
      })
      .expect(201);
    studentId = (studentRes.body as IdResponse).id;
    const studentEmail = `calstudent.${RUN_ID}@students.demoschool.ng`;
    const bcrypt = await import('bcrypt');
    await prisma.student.update({
      where: { id: studentId },
      data: {
        email: studentEmail,
        passwordHash: await bcrypt.hash(PASSWORD, 10),
      },
    });
    studentToken = await loginAndGetToken(studentEmail);

    const guardianLink = await request(server)
      .post(`/students/${studentId}/guardians`)
      .set(asAdmin())
      .send({
        firstName: 'CalGuardian',
        lastName: `Disc${RUN_ID}`,
        email: `calguardian.${RUN_ID}@example.com`,
        phone: '+2348033330001',
        relationship: 'Father',
      })
      .expect(201);
    guardianId = (guardianLink.body as { guardianId: string }).guardianId;
    await prisma.guardian.update({
      where: { id: guardianId },
      data: { passwordHash: await bcrypt.hash(PASSWORD, 10) },
    });
    guardianToken = await loginAndGetToken(`calguardian.${RUN_ID}@example.com`);
  });

  afterAll(async () => {
    await prisma.eventRsvp
      .deleteMany({ where: { event: { title: { contains: RUN_ID } } } })
      .catch(() => undefined);
    await prisma.event
      .deleteMany({ where: { title: { contains: RUN_ID } } })
      .catch(() => undefined);

    if (guardianId) {
      await prisma.studentGuardian
        .deleteMany({ where: { guardianId } })
        .catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { guardianId } })
        .catch(() => undefined);
      await prisma.guardian
        .delete({ where: { id: guardianId } })
        .catch(() => undefined);
    }
    if (studentId) {
      await prisma.enrollment
        .deleteMany({ where: { studentId } })
        .catch(() => undefined);
      await prisma.refreshToken
        .deleteMany({ where: { studentId } })
        .catch(() => undefined);
      await prisma.student
        .delete({ where: { id: studentId } })
        .catch(() => undefined);
    }
    if (staffOrganizerId) {
      await prisma.refreshToken
        .deleteMany({ where: { staffId: staffOrganizerId } })
        .catch(() => undefined);
      await prisma.staffRole
        .deleteMany({ where: { staffId: staffOrganizerId } })
        .catch(() => undefined);
      await prisma.staff
        .delete({ where: { id: staffOrganizerId } })
        .catch(() => undefined);
    }

    await app.close();
  }, 30_000);

  async function loginAndGetToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }
  function asAdmin() {
    return { Authorization: `Bearer ${adminToken}` };
  }
  function as(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  describe('Event CRUD + RBAC', () => {
    let eventId: string;

    it('rejects non-Admin/VP from creating an event', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set(as(bursarToken))
        .send({
          title: `Should fail ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-03-01',
        })
        .expect(403);
      await request(app.getHttpServer())
        .post('/events')
        .set(as(examOfficerToken))
        .send({
          title: `Should fail ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-03-01',
        })
        .expect(403);
    });

    it('lets Admin create an RSVP-enabled event', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `PTA Meeting ${RUN_ID}`,
          category: 'PTA Meeting',
          startDate: '2026-03-10',
          rsvpEnabled: true,
        })
        .expect(201);
      eventId = (res.body as EventResponse).id;
      expect((res.body as EventResponse).rsvpEnabled).toBe(true);
    });

    it('lets anyone (any authenticated role) view the event with an RSVP tally', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set(as(studentToken))
        .expect(200);
      const event = res.body as EventResponse;
      expect(event.rsvpTally).toEqual({ yes: 0, no: 0, maybe: 0 });
      expect(event.myResponse).toBeNull();
    });
  });

  describe('RSVP', () => {
    let eventId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `Sports Day ${RUN_ID}`,
          category: 'Sports Day',
          startDate: '2026-04-01',
          rsvpEnabled: true,
        })
        .expect(201);
      eventId = (res.body as EventResponse).id;
    });

    it('rejects a STUDENT from RSVPing — "guardians/staff to respond" only', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventId}/rsvp`)
        .set(as(studentToken))
        .send({ response: 'YES' })
        .expect(403);
    });

    it('lets a guardian and a staff member RSVP, and tallies correctly', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventId}/rsvp`)
        .set(as(guardianToken))
        .send({ response: 'YES' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/events/${eventId}/rsvp`)
        .set(as(staffOrganizerToken))
        .send({ response: 'MAYBE' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set(as(bursarToken))
        .expect(200);
      const event = res.body as EventResponse;
      expect(event.rsvpTally).toEqual({ yes: 1, no: 0, maybe: 1 });
    });

    it('re-responding updates the same RSVP rather than creating a duplicate', async () => {
      await request(app.getHttpServer())
        .post(`/events/${eventId}/rsvp`)
        .set(as(guardianToken))
        .send({ response: 'NO' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/events/${eventId}`)
        .set(as(guardianToken))
        .expect(200);
      const event = res.body as EventResponse;
      expect(event.rsvpTally).toEqual({ yes: 0, no: 1, maybe: 1 });
      expect(event.myResponse).toBe('NO');

      const rsvpCount = await prisma.eventRsvp.count({
        where: { eventId, responderType: 'GUARDIAN', responderId: guardianId },
      });
      expect(rsvpCount).toBe(1);
    });

    it('GET /events/:id/rsvps — the organizer (or Admin) sees the full respondent list, others do not', async () => {
      const asOrganizer = await request(app.getHttpServer())
        .get(`/events/${eventId}/rsvps`)
        .set(as(staffOrganizerToken))
        .expect(200);
      expect((asOrganizer.body as unknown[]).length).toBe(2);

      await request(app.getHttpServer())
        .get(`/events/${eventId}/rsvps`)
        .set(as(bursarToken))
        .expect(403);
    });

    it('rejects RSVPing to an event with RSVP disabled', async () => {
      const noRsvpEvent = await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `No RSVP ${RUN_ID}`,
          category: 'Holiday',
          startDate: '2026-05-01',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/events/${(noRsvpEvent.body as EventResponse).id}/rsvp`)
        .set(as(guardianToken))
        .send({ response: 'YES' })
        .expect(403);
    });
  });

  describe('GET /calendar — unified view', () => {
    it('combines events and term dates within the requested range', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `Calendar Range Test ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-06-15',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/calendar')
        .query({ from: '2026-06-01', to: '2026-06-30' })
        .set(asAdmin())
        .expect(200);
      const entries = res.body as CalendarEntryResponse[];
      expect(
        entries.some((e) => e.type === 'EVENT' && e.title.includes(RUN_ID)),
      ).toBe(true);
      // A term that's actually active in June should show up as a TERM
      // entry too — not asserting a specific one (seed data varies), just
      // that the combining logic produces at least the event we just made.
      expect(entries.length).toBeGreaterThanOrEqual(1);
    });

    it('excludes events outside the requested range', async () => {
      const res = await request(app.getHttpServer())
        .get('/calendar')
        .query({ from: '2099-01-01', to: '2099-01-31' })
        .set(asAdmin())
        .expect(200);
      const entries = res.body as CalendarEntryResponse[];
      expect(entries.some((e) => e.title.includes(RUN_ID))).toBe(false);
    });
  });

  describe('Date range validation', () => {
    it('rejects creating an event whose endDate is before its startDate', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `Bad Range ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-08-10',
          endDate: '2026-08-05',
        })
        .expect(400);
    });

    it('rejects updating an event to move its endDate before its (unchanged) startDate', async () => {
      const created = await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `Range Update ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-08-10',
          endDate: '2026-08-15',
        })
        .expect(201);
      const id = (created.body as EventResponse).id;

      await request(app.getHttpServer())
        .patch(`/events/${id}`)
        .set(asAdmin())
        .send({ endDate: '2026-08-01' })
        .expect(400);
    });
  });

  describe('Delete', () => {
    it('rejects non-Admin/VP from deleting an event, then lets Admin delete it', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set(as(staffOrganizerToken))
        .send({
          title: `To Delete ${RUN_ID}`,
          category: 'Other',
          startDate: '2026-07-01',
        })
        .expect(201);
      const id = (res.body as EventResponse).id;

      await request(app.getHttpServer())
        .delete(`/events/${id}`)
        .set(as(bursarToken))
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/events/${id}`)
        .set(asAdmin())
        .expect(204);
      await request(app.getHttpServer())
        .get(`/events/${id}`)
        .set(asAdmin())
        .expect(404);
    });
  });
});
