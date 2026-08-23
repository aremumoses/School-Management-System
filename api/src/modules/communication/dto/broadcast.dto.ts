import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BroadcastTargetType, RecipientType } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

// IN_APP is deliberately excluded — every recipient gets it automatically
// (docs/16-module-communication.md §1), it isn't something a caller opts
// into per broadcast. See NotificationChannel's schema comment.
export const BROADCAST_CHANNELS = ['SMS', 'EMAIL', 'WHATSAPP', 'PUSH'] as const;
export type BroadcastChannel = (typeof BROADCAST_CHANNELS)[number];

export class CreateBroadcastDto {
  @ApiProperty({ enum: BroadcastTargetType })
  @IsEnum(BroadcastTargetType)
  targetType!: BroadcastTargetType;

  @ApiPropertyOptional({
    description:
      'Arm id for CLASS, a Role value for ROLE (omit for "all staff"), or the recipient id for INDIVIDUAL. Unused for WHOLE_SCHOOL.',
  })
  @ValidateIf(
    (dto: CreateBroadcastDto) =>
      dto.targetType === BroadcastTargetType.CLASS ||
      dto.targetType === BroadcastTargetType.INDIVIDUAL,
  )
  @IsString()
  @IsNotEmpty()
  targetId?: string;

  @ApiPropertyOptional({
    enum: RecipientType,
    description:
      'Required when targetType is INDIVIDUAL — which table targetId refers to.',
  })
  @ValidateIf(
    (dto: CreateBroadcastDto) =>
      dto.targetType === BroadcastTargetType.INDIVIDUAL,
  )
  @IsEnum(RecipientType)
  targetRecipientType?: RecipientType;

  @ApiProperty({
    example: ['SMS', 'EMAIL'],
    isArray: true,
    enum: BROADCAST_CHANNELS,
    description:
      'Real-channel sends in addition to the always-included IN_APP one — pass [] for an in-app-only notice.',
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(BROADCAST_CHANNELS, { each: true })
  channels!: BroadcastChannel[];

  @ApiPropertyOptional({
    description:
      'Use an existing MessageTemplate instead of a one-off message.',
  })
  @ValidateIf((dto: CreateBroadcastDto) => !dto.message)
  @IsString()
  @IsNotEmpty()
  templateId?: string;

  @ApiPropertyOptional({ example: 'School resumes Monday 12th January.' })
  @ValidateIf((dto: CreateBroadcastDto) => !dto.templateId)
  @IsString()
  @IsNotEmpty()
  message?: string;

  @ApiPropertyOptional({
    description:
      'Preview only — resolves and authorizes the target, returning exactly who would receive it, without sending anything or recording a BroadcastLog.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
