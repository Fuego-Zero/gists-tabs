import { BaseException } from './BaseException';

export class BreakException extends BaseException {
  constructor() {
    super('BreakException');
  }
}
