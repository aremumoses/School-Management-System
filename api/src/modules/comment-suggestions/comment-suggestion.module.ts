import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ResultsModule } from '../results/results.module';
import { CommentSuggestionController } from './comment-suggestion.controller';
import { CommentSuggestionService } from './comment-suggestion.service';

@Module({
  imports: [
    ResultsModule,
    // Stage 11 throttler pattern (see admissions/hr modules) — this one
    // guards real per-call LLM cost rather than a form-flooding/brute-force
    // concern, but the mechanism is identical.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 20,
        skipIf: () => process.env.NODE_ENV === 'test',
      },
    ]),
  ],
  controllers: [CommentSuggestionController],
  providers: [CommentSuggestionService],
})
export class CommentSuggestionModule {}
