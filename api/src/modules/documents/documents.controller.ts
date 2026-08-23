import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestUser } from '../../common/types/auth.types';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto, QueryDocumentsDto } from './dto/document.dto';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // docs/03-roles-and-permissions.md §2 "Documents/certificates" row —
  // ADMIN=F, VICE_PRINCIPAL=E, everyone else "–" except Student/Parent's
  // own-record "V" (enforced in the service, see assertAccess).
  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post('generate')
  @ApiOperation({
    summary: 'Request a testimonial/certificate — starts as DRAFT, no PDF yet',
  })
  generate(@Body() dto: GenerateDocumentDto, @CurrentUser() user: RequestUser) {
    return this.documentsService.generate(dto, user);
  }

  // ADMIN only, even though VICE_PRINCIPAL has "E" generally — the prompt
  // is explicit that approval specifically is an Admin-only sign-off step,
  // the same way Discipline's Suspension/Expulsion approval is.
  @Roles('ADMIN')
  @Post(':id/approve')
  @ApiOperation({
    summary:
      'Approve a DRAFT document — records the approving Admin + timestamp and triggers PDF generation',
  })
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.approve(id, user);
  }

  @Roles()
  @Get()
  @ApiOperation({
    summary: 'List documents, scoped to what the caller may see',
  })
  list(@Query() query: QueryDocumentsDto, @CurrentUser() user: RequestUser) {
    return this.documentsService.list(query, user);
  }

  // A single response shape for both "check status" and "download" —
  // `url` is simply null until APPROVED (the PDF isn't generated before
  // then), so there's nothing extra to gate separately.
  @Roles()
  @Get(':id')
  @ApiOperation({
    summary: 'Document status + download URL (null until approved)',
  })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.getOrThrow(id, user);
  }
}
