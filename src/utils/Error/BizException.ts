import { BaseException } from './BaseException';

export class BizException extends BaseException {
  constructor(message?: string) {
    super('BizException', message);
  }
}
