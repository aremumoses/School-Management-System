import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { EnvConfig } from '../config/env.validation';

// Prisma 7 connects through an explicit driver adapter rather than a `url`
// declared in schema.prisma (that field is no longer supported there) — see
// https://pris.ly/d/prisma7-client-config.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<EnvConfig, true>) {
    const adapter = new PrismaPg({
      connectionString: configService.get('DATABASE_URL', { infer: true }),
    });
    super({
      adapter,
      // Secure-by-default: every query omits passwordHash unless a specific
      // call opts back in with `omit: { passwordHash: false }` — only
      // AuthService's credential lookups should ever need to. This means a
      // future endpoint can never accidentally leak a hash just because
      // someone forgot a `select`.
      omit: {
        staff: { passwordHash: true },
        student: { passwordHash: true },
        guardian: { passwordHash: true },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }
}
