import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WordBookService } from './word-book.service';
import type { WordQuery } from '@nexura/common/word';
import { AuthGuard } from '@libs/shared/auth/auth.guard';

@Controller('word-book')
export class WordBookController {
  constructor(private readonly wordBookService: WordBookService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Query() query: WordQuery) {
    return this.wordBookService.findAll(query);
  }
}
