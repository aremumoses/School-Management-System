import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Roles } from '../src/common/decorators/roles.decorator';

// Throwaway controller, registered only in this test's module — exists
// purely to prove the @Roles('ADMIN') role-gating mechanism rejects a
// non-admin token with 403, without shipping a meaningless "ping" route in
// real application code. The guard logic under test doesn't care which
// controller it's protecting.
@Controller('test-only')
class AdminOnlyTestController {
  @Roles('ADMIN')
  @Get('admin-only')
  adminOnly() {
    return { ok: true };
  }
}

interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: { email: string; roles: string[] };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const ADMIN_EMAIL = 'admin@demoschool.ng';
  const TEACHER_EMAIL = 'tunde.bakare@demoschool.ng';
  const PASSWORD = 'Password123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdminOnlyTestController],
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

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function loginAs(email: string): Promise<AuthTokenResponse> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return res.body as AuthTokenResponse;
  }

  describe('POST /auth/login', () => {
    it('issues a token pair for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: PASSWORD })
        .expect(201);
      const body = res.body as AuthTokenResponse;

      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe(ADMIN_EMAIL);
      expect(body.user.roles).toContain('ADMIN');
    });

    it('rejects an invalid password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'WrongPassword1' })
        .expect(401);
    });

    it('rejects an unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@nowhere.ng', password: PASSWORD })
        .expect(401);
    });

    it('rejects a malformed request body cleanly (401, not a 500 crash)', async () => {
      // Guards run before Pipes in Nest's request lifecycle, so
      // LocalAuthGuard (and the defensive type checks in
      // AuthService.validateCredentials) handle this before LoginDto's
      // validation would ever get a chance to — the missing `password`
      // field never reaches a DTO-validated 400 path. What actually
      // matters here is that it fails safely (401) instead of crashing.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email' })
        .expect(401);
    });
  });

  describe('GET /auth/me (any authenticated user)', () => {
    it('returns the current user for a valid token', async () => {
      const { accessToken } = await loginAs(ADMIN_EMAIL);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect((res.body as { roles: string[] }).roles).toContain('ADMIN');
    });

    it('rejects a request with no token at all (401)', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('rejects a request with an expired token (401)', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'whoever', userType: 'STAFF', roles: ['ADMIN'] },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: -10 },
      );
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('rejects a malformed/garbage token (401)', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer garbage.token.value')
        .expect(401);
    });
  });

  describe("role-gated route (@Roles('ADMIN'))", () => {
    it('allows a valid admin token (200)', async () => {
      const { accessToken } = await loginAs(ADMIN_EMAIL);

      await request(app.getHttpServer())
        .get('/test-only/admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('rejects a valid token for a non-admin role (403)', async () => {
      const { accessToken } = await loginAs(TEACHER_EMAIL);

      await request(app.getHttpServer())
        .get('/test-only/admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('rejects a request with no token at all (401, before any role check)', async () => {
      await request(app.getHttpServer())
        .get('/test-only/admin-only')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and rejects the old one on reuse', async () => {
      const { refreshToken } = await loginAs(ADMIN_EMAIL);

      const rotated = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      const rotatedBody = rotated.body as AuthTokenResponse;

      expect(rotatedBody.accessToken).toBeDefined();
      expect(rotatedBody.refreshToken).toBeDefined();
      expect(rotatedBody.refreshToken).not.toBe(refreshToken);

      // Replay of the now-revoked original token must fail.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('rejects a garbage refresh token (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh token so it can no longer be used to refresh', async () => {
      const { refreshToken } = await loginAs(ADMIN_EMAIL);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('is idempotent for an already-invalid token (still 204, not an error)', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(204);
    });
  });

  // Stage 11 hardening — AuthModule's ThrottlerGuard config skips enforcement
  // when NODE_ENV==='test' (every other test in this file logs in repeatedly,
  // well past these limits, within one throttle window — see the skipIf
  // comment in auth.module.ts). These two tests are the deliberate exception:
  // flip NODE_ENV back so the real, production-shaped limit is actually
  // exercised, then always restore it in `finally` so no later test/file is
  // affected by the flip.
  describe('Rate limiting (Stage 11 hardening)', () => {
    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('throttles POST /auth/login after 5 requests/min (429 on the 6th)', async () => {
      process.env.NODE_ENV = 'production';

      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'nobody@example.com', password: 'wrong' });
        expect(res.status).toBe(401);
      }

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong' })
        .expect(429);
    });

    it('throttles POST /auth/refresh after 10 requests/min (429 on the 11th)', async () => {
      process.env.NODE_ENV = 'production';

      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: 'not-a-real-token' });
        expect(res.status).toBe(401);
      }

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(429);
    });
  });
});
