import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateGradingScaleDto } from './dto/update-grading-scale.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolService } from './school.service';

/** Phase 2 modules that can be toggled per-school. API access to the actual
 *  modules is unchanged; this only controls sidebar nav visibility. */
export enum SchoolModule {
  HOSTEL = 'HOSTEL',
  TRANSPORT = 'TRANSPORT',
  LIBRARY = 'LIBRARY',
  CBT = 'CBT',
}

class UpdateModulesDto {
  @IsArray()
  @IsEnum(SchoolModule, { each: true })
  @IsOptional()
  enabledModules!: SchoolModule[];
}

/**
 * Source-of-truth permission matrix (mirrors docs/03-roles-and-permissions.md §2).
 * Read-only — changing it requires a code change and redeploy by design.
 */
const PERMISSION_MATRIX = {
  ADMIN: 'F on everything',
  VICE_PRINCIPAL: 'E on most modules, A on results approval, V on settings',
  HOD: 'E on own dept, V elsewhere',
  CLASS_TEACHER: 'E on own class attendance/conduct, V on scores',
  SUBJECT_TEACHER: 'E on own subject scores/attendance period, V on class',
  EXAM_OFFICER: 'F on results/broadsheets/CBT, V on attendance/scores',
  BURSAR: 'F on fees/invoicing/payments',
  LIBRARIAN: 'F on library',
  HOSTEL_WARDEN: 'F on hostel, V on student records',
  TRANSPORT_OFFICER: 'F on transport',
  HR_OFFICER: 'F on staff/HR records',
  FRONT_DESK: 'F on gate/visitor log',
  STUDENT: 'V on own record only',
  PARENT: 'V on own wards only, can pay fees and RSVP events',
} as const;

@ApiTags('school')
@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  // Public — the application form at /apply needs the school name without
  // a logged-in session; a school's name/logo are not sensitive information.
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get the school profile (single row)' })
  getSchool() {
    return this.schoolService.getSchool();
  }

  @Roles('ADMIN')
  @Patch()
  @ApiOperation({ summary: 'Update school profile fields' })
  updateSchool(@Body() dto: UpdateSchoolDto) {
    return this.schoolService.updateProfile(dto);
  }

  @Roles('ADMIN')
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload the school logo' })
  uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    return this.schoolService.uploadLogo(file);
  }

  @Roles('ADMIN')
  @Patch('grading-scale')
  @ApiOperation({
    summary: 'Update the grading scale and default CA/exam weighting',
  })
  updateGradingScale(@Body() dto: UpdateGradingScaleDto) {
    return this.schoolService.updateGradingScale(dto);
  }

  @Roles('ADMIN')
  @Patch('modules')
  @ApiOperation({
    summary:
      'Toggle Phase 2 modules (HOSTEL, TRANSPORT, LIBRARY, CBT) for this school — controls sidebar visibility only, not API access',
  })
  async updateEnabledModules(@Body() dto: UpdateModulesDto) {
    return this.schoolService.updateEnabledModules(dto.enabledModules ?? []);
  }

  /** Read-only mirror of the permission matrix in docs/03-roles-and-permissions.md §2.
   *  The matrix is enforced in code (@Roles decorators); this endpoint only exposes it. */
  @Roles('ADMIN')
  @Get('permission-matrix')
  @ApiOperation({
    summary:
      'Read-only permission matrix — what each role can do. Changing it requires a code change.',
  })
  getPermissionMatrix() {
    return PERMISSION_MATRIX;
  }
}
