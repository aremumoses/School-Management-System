import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { GeneratePromotionSuggestionsDto } from './dto/generate-promotion-suggestions.dto';
import { PromotionService } from './promotion.service';

@ApiTags('promotion')
@Controller('sessions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Roles('ADMIN')
  @Post(':id/promotion-suggestions')
  @ApiOperation({
    summary:
      "Suggest (don't apply) Promoted/Repeated/Graduated outcomes for every student active in this session's final term",
  })
  generateSuggestions(
    @Param('id') sessionId: string,
    @Body() dto: GeneratePromotionSuggestionsDto,
  ) {
    return this.promotionService.suggestPromotions(sessionId, dto);
  }
}
