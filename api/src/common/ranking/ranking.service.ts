import { Injectable } from '@nestjs/common';

export interface RankableEntry<T> {
  id: T;
  score: number;
}

export interface RankedEntry<T> extends RankableEntry<T> {
  position: number;
}

/**
 * Standard competition ranking (docs/14-module-academic-results.md §5's
 * "shared rank") — a student's position is 1 + the count of OTHER entries
 * with a STRICTLY higher score. Two students tied for the top score are
 * both position 1; the next distinct score is position 3, not 2 — ties
 * "use up" the positions they'd otherwise occupy, matching the doc's own
 * "two students both 3rd" example rather than leaving a gap-free 1-2-3.
 */
@Injectable()
export class RankingService {
  rank<T>(entries: RankableEntry<T>[]): RankedEntry<T>[] {
    return entries.map((entry) => ({
      ...entry,
      position: 1 + entries.filter((other) => other.score > entry.score).length,
    }));
  }
}
