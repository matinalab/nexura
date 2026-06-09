import type { TokenPayload } from '@nexura/common/user';

declare module 'express' {
  interface Request {
    user: TokenPayload;
  }
}