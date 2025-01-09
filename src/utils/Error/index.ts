import type { APIException } from './APIException';
import type { BizException } from './BizException';
import type { BreakException } from './BreakException';
import type { HTTPException } from './HTTPException';

export * from './APIException';
export * from './BizException';
export * from './BreakException';
export * from './HTTPException';

export const isBizException = (exception: any): exception is BizException => exception.name === 'BizException';
export const isAPIException = (exception: any): exception is APIException => exception.name === 'APIException';
export const isHTTPException = (exception: any): exception is HTTPException => exception.name === 'HTTPException';
export const isBreakException = (exception: any): exception is BreakException => exception.name === 'BreakException';
