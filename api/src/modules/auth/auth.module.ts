import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule,
    // No default secret/expiry here on purpose — AuthService passes a
    // distinct secret and expiry explicitly on every sign()/verify() call
    // (access vs refresh use different secrets, see env.validation.ts).
    JwtModule.register({}),
    // Stage 11 hardening — brute-force protection on /auth/login and
    // /auth/refresh specifically (not applied globally: every other route
    // already requires a valid JWT, a much stronger gate than IP-based
    // throttling; throttling every authenticated UI call risks false-positive
    // lockouts for legitimate bulk-action usage). Bound per-route via
    // @UseGuards(ThrottlerGuard) on AuthController, not as a global APP_GUARD.
    //
    // skipIf NODE_ENV==='test': the e2e suite logs in 5-9+ times per spec
    // file (each file gets its own app instance and shared in-memory
    // throttle counter), well past this limit, well within one throttle
    // window — without this, a 5/min production-appropriate limit breaks
    // unrelated tests with spurious 429s. The real throttling behavior is
    // still exercised directly in auth.e2e-spec.ts, which deliberately
    // flips NODE_ENV back for the duration of that one test.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 10,
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    // Registered here (rather than AppModule) to keep AuthModule
    // self-contained — Nest treats APP_GUARD as global regardless of which
    // imported module declares it. Order matters: authentication (JWT) runs
    // before authorization (roles).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
