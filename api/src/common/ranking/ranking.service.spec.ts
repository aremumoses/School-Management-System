import { RankingService } from './ranking.service';

describe('RankingService', () => {
  const ranking = new RankingService();

  it('ranks distinct scores 1, 2, 3, ... in descending order', () => {
    const result = ranking.rank([
      { id: 'a', score: 50 },
      { id: 'b', score: 90 },
      { id: 'c', score: 70 },
    ]);

    expect(find(result, 'b').position).toBe(1);
    expect(find(result, 'c').position).toBe(2);
    expect(find(result, 'a').position).toBe(3);
  });

  it('gives two top-tied students the same rank, and skips the next position', () => {
    // 90, 90, 70 -> 1st, 1st, 3rd (not 1st, 1st, 2nd)
    const result = ranking.rank([
      { id: 'a', score: 90 },
      { id: 'b', score: 90 },
      { id: 'c', score: 70 },
    ]);

    expect(find(result, 'a').position).toBe(1);
    expect(find(result, 'b').position).toBe(1);
    expect(find(result, 'c').position).toBe(3);
  });

  it('handles a tie in the middle of the pack', () => {
    // 90, 80, 80, 60 -> 1st, 2nd, 2nd, 4th
    const result = ranking.rank([
      { id: 'a', score: 90 },
      { id: 'b', score: 80 },
      { id: 'c', score: 80 },
      { id: 'd', score: 60 },
    ]);

    expect(find(result, 'a').position).toBe(1);
    expect(find(result, 'b').position).toBe(2);
    expect(find(result, 'c').position).toBe(2);
    expect(find(result, 'd').position).toBe(4);
  });

  it('gives every student the same rank when all scores tie', () => {
    const result = ranking.rank([
      { id: 'a', score: 75 },
      { id: 'b', score: 75 },
      { id: 'c', score: 75 },
    ]);

    expect(result.every((entry) => entry.position === 1)).toBe(true);
  });

  it('ranks a single entry as position 1', () => {
    const result = ranking.rank([{ id: 'a', score: 42 }]);
    expect(result[0].position).toBe(1);
  });

  it('handles an empty list without throwing', () => {
    expect(ranking.rank([])).toEqual([]);
  });

  it('treats a three-way tie for 2nd correctly (1st, 2nd, 2nd, 2nd, 5th)', () => {
    const result = ranking.rank([
      { id: 'a', score: 100 },
      { id: 'b', score: 80 },
      { id: 'c', score: 80 },
      { id: 'd', score: 80 },
      { id: 'e', score: 50 },
    ]);

    expect(find(result, 'a').position).toBe(1);
    expect(find(result, 'b').position).toBe(2);
    expect(find(result, 'c').position).toBe(2);
    expect(find(result, 'd').position).toBe(2);
    expect(find(result, 'e').position).toBe(5);
  });

  function find<T>(
    entries: { id: T; position: number }[],
    id: T,
  ): { id: T; position: number } {
    const found = entries.find((entry) => entry.id === id);
    if (!found) throw new Error(`No entry with id ${String(id)}`);
    return found;
  }
});
