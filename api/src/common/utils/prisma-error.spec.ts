import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { translatePrismaError } from './prisma-error';

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock', {
    code,
    clientVersion: 'test',
  });
}

describe('translatePrismaError', () => {
  it('converts P2002 (unique constraint) to ConflictException', () => {
    expect(() => translatePrismaError(knownError('P2002'), 'conflict')).toThrow(
      ConflictException,
    );
  });

  it('converts P2003 (foreign key constraint) to ConflictException', () => {
    expect(() => translatePrismaError(knownError('P2003'), 'conflict')).toThrow(
      ConflictException,
    );
  });

  it('converts P2025 (record not found) to NotFoundException', () => {
    expect(() =>
      translatePrismaError(knownError('P2025'), 'not found'),
    ).toThrow(NotFoundException);
  });

  it('rethrows anything else unchanged', () => {
    const original = new Error('something else');
    expect(() => translatePrismaError(original, 'n/a')).toThrow(original);
  });
});
