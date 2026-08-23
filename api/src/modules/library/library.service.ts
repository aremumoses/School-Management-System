import { Injectable, NotFoundException } from '@nestjs/common';
import type { Book } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import { CreateBookDto, UpdateBookDto } from './dto/library.dto';

export interface BookDto {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto): Promise<BookDto> {
    try {
      const book = await this.prisma.book.create({
        data: {
          title: dto.title,
          author: dto.author,
          isbn: dto.isbn?.trim() || null,
          category: dto.category,
          totalCopies: dto.totalCopies,
          shelfLocation: dto.shelfLocation?.trim() || null,
        },
      });
      return this.toDto(book, dto.totalCopies);
    } catch (error) {
      return translatePrismaError(
        error,
        'A book with this ISBN already exists',
      );
    }
  }

  async update(id: string, dto: UpdateBookDto): Promise<BookDto> {
    await this.getOrThrow(id);
    try {
      const book = await this.prisma.book.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.author !== undefined && { author: dto.author }),
          ...(dto.isbn !== undefined && { isbn: dto.isbn.trim() || null }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.totalCopies !== undefined && {
            totalCopies: dto.totalCopies,
          }),
          ...(dto.shelfLocation !== undefined && {
            shelfLocation: dto.shelfLocation.trim() || null,
          }),
        },
      });
      return this.withAvailability(book);
    } catch (error) {
      return translatePrismaError(
        error,
        'A book with this ISBN already exists',
      );
    }
  }

  async list(search?: string, category?: string): Promise<BookDto[]> {
    const books = await this.prisma.book.findMany({
      where: {
        ...(category && { category }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
            { isbn: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { title: 'asc' },
    });
    return Promise.all(books.map((b) => this.withAvailability(b)));
  }

  async getOne(id: string): Promise<BookDto> {
    const book = await this.getOrThrow(id);
    return this.withAvailability(book);
  }

  private async getOrThrow(id: string): Promise<Book> {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  /** Derived, not maintained — active (unreturned) loans subtracted from totalCopies on every read, so it can never drift. */
  private async withAvailability(book: Book): Promise<BookDto> {
    const activeLoans = await this.prisma.loan.count({
      where: { bookId: book.id, returnedAt: null },
    });
    return this.toDto(book, book.totalCopies, activeLoans);
  }

  private toDto(book: Book, totalCopies: number, activeLoans = 0): BookDto {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      totalCopies,
      availableCopies: Math.max(0, totalCopies - activeLoans),
      shelfLocation: book.shelfLocation,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}
