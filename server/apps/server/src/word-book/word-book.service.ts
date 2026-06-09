import { Injectable } from '@nestjs/common';
import type { WordQuery } from '@nexura/common/word';
import { PrismaService, ResponseService } from '@libs/shared';
import type { Prisma } from '@libs/shared/generated/prisma/client';

@Injectable()
export class WordBookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
  ) {}
  async findAll(query: WordQuery) {
    const { page, pageSize, word, ...rest } = query;
    const tags = Object.fromEntries(Object.entries(rest).filter(([key, value]) => value === true));
    const where: Prisma.WordBookWhereInput = {
      word: word ? { contains: word } : undefined, ...tags
    };
    const total = await this.prisma.wordBook.count({ where });
    const list = await this.prisma.wordBook.findMany({
      where,
      skip: Number(page - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: {
        frq: 'desc',
      },
    });
    return this.response.success({
      total,
      list,
    });
  }
}
