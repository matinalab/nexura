import { serverApi, type Response } from '..';
import type { ResultLearn } from '@nexura/common/learn';
import type { Word } from '@nexura/common/word';
export const getWordList = (courseId: string) => serverApi.get(`/learn/word/${courseId}`) as Promise<Response<Word[]>>;
export const saveWordMaster = (wordIds: string[]) => serverApi.post(`/learn/word/master`, { wordIds }) as Promise<Response<ResultLearn>>;