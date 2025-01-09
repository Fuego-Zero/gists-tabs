import { BaseException } from './BaseException';

export class HTTPException extends BaseException {
  constructor(message?: string) {
    super('HTTPException', message);
  }
}
