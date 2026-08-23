import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { CreateResourceDto, QueryResourcesDto } from './dto/resource.dto';
import { ResourcesService } from './resources.service';

const UPLOADER_ROLES = ['SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD'] as const;

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Roles(...UPLOADER_ROLES)
  @Post()
  @ApiOperation({
    summary:
      'Share a resource with a class — the caller must teach that class/subject this term',
  })
  create(@Body() dto: CreateResourceDto, @CurrentUser() user: RequestUser) {
    return this.resourcesService.create(dto, user);
  }

  @Roles(...UPLOADER_ROLES, 'ADMIN', 'VICE_PRINCIPAL', 'STUDENT', 'PARENT')
  @Get()
  @ApiOperation({
    summary:
      "List resources — teachers their own uploads, students/parents their (ward's) class catalog, filterable by subject/type/search",
  })
  list(@Query() query: QueryResourcesDto, @CurrentUser() user: RequestUser) {
    return this.resourcesService.list(query, user);
  }

  @Roles(...UPLOADER_ROLES)
  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: "Upload the resource's file (notes/slides/past questions)",
  })
  uploadFile(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.resourcesService.uploadFile(id, file, user);
  }

  @Roles(...UPLOADER_ROLES, 'ADMIN', 'VICE_PRINCIPAL')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a resource (uploader, or an unscoped role)',
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<void> {
    await this.resourcesService.delete(id, user);
  }
}
