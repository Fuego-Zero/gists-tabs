import type { ExceptionName } from './types';

export class BaseException extends Error {
  constructor(
    readonly name: ExceptionName,
    message?: string,
  ) {
    super(message);
    this.name = name;
  }
}
