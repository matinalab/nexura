import { serverApi, type Response } from '..'
import type { WordList, WordQuery } from '@nexura/common/word';

export const getWordBookList = (params: WordQuery): Promise<Response<WordList>> => {
    return serverApi.get('/word-book', { params }) as Promise<Response<WordList>>;
}