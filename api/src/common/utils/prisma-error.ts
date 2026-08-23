import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Converts the common Prisma error codes (unique constraint violation,
 * foreign key constraint violation, record-not-found on update/delete)
 * into clean HTTP exceptions instead of letting them leak out as a raw 500.
 * Anything else is rethrown unchanged.
 */
export function translatePrismaError(
  error: unknown,
  conflictMessage: string,
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' || error.code === 'P2003') {
      throw new ConflictException(conflictMessage);
    }
    if (error.code === 'P2025') {
      throw new NotFoundException(conflictMessage);
    }
  }
  throw error;
}
