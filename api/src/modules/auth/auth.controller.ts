import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { AuthenticatedUser, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';

interface RequestWithAuthenticatedUser extends Request {
  user: AuthenticatedUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stage 11 hardening — brute-force protection. Throttled tighter than
  // AuthModule's 10/min default since a credential-guessing script is the
  // realistic threat here, not a legitimate user retrying a typo five times.
  @Public()
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: 'Log in with email + password' })
  @ApiBody({ type: LoginDto })
  login(@Req() req: RequestWithAuthenticatedUser) {
    return this.authService.login(req.user);
  }

  // Explicit @Throttle() here even though it matches AuthModule's configured
  // default — relying on the module-level default to apply implicitly
  // (no override decorator at all) did not reliably throttle in testing;
  // being explicit on every guarded route avoids depending on that fallback.
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access+refresh pair',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  // Any authenticated user, any role — the simplest possible proof that the
  // JWT auth + RBAC mechanism works end to end (see prompts/stage-01.../01-backend-prompt.md
  // "Done when"). Role-specific gating is exercised in auth.e2e-spec.ts.
  @Roles()
  @Get('me')
  @ApiOperation({ summary: "Current authenticated user's identity" })
  me(@CurrentUser() user: RequestUser): RequestUser {
    return user;
  }
}
