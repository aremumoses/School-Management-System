import { parseDurationToMs } from './parse-duration';

describe('parseDurationToMs', () => {
  it('parses minutes', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
  });

  it('parses days', () => {
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('parses seconds and hours', () => {
    expect(parseDurationToMs('30s')).toBe(30 * 1000);
    expect(parseDurationToMs('2h')).toBe(2 * 60 * 60 * 1000);
  });

  it('throws on an unsupported format', () => {
    expect(() => parseDurationToMs('1w')).toThrow(/Invalid duration/);
    expect(() => parseDurationToMs('garbage')).toThrow(/Invalid duration/);
  });
});
