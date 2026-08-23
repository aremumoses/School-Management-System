import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateTrainingRecordDto } from './dto/training.dto';
import { TrainingService } from './training.service';

@ApiTags('hr-training')
@Controller('hr')
export class TrainingController {
  constructor(private readonly service: TrainingService) {}

  @Roles('HR_OFFICER', 'ADMIN')
  @Post('training-records')
  @UseInterceptors(
    FileInterceptor('certificate', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        staffId: { type: 'string' },
        title: { type: 'string' },
        provider: { type: 'string' },
        completedDate: { type: 'string', example: '2026-06-01' },
        hoursOrCredits: { type: 'number' },
        certificate: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Log a training/CPD record, with an optional certificate upload',
  })
  create(
    @Body() dto: CreateTrainingRecordDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(dto, user, file);
  }

  @Roles('HR_OFFICER', 'ADMIN')
  @Get('staff/:id/training-history')
  getHistory(@Param('id') id: string) {
    return this.service.getHistory(id);
  }
}
