import { BaseException } from './BaseException';

export class APIException extends BaseException {
  constructor(message?: string) {
    super('APIException', message);
  }
}
