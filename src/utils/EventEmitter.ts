import { isArray, isFunction } from './typeUtil';

type Listener = (...args: any[]) => void;
type Listeners<T> = Record<keyof T, T[keyof T][] | null>;

class EventEmitter<T extends Record<string, Listener>> {
  private _listeners: Listeners<T> = {} as Listeners<T>;
  private _maxListener = 10;

  /**
   * 发布通知
   *
   * @param eventName 事件名称
   * @param args 参数
   */
  emit<P extends keyof T>(eventName: P, ...args: Parameters<T[P]>) {
    const listeners = this._listeners[eventName];
    if (!isArray(listeners)) return;

    listeners.forEach((listener) => {
      if (isFunction(listener)) listener(...args);
    });
  }

  /**
   * 返回指定事件的监听器数组
   *
   * @param eventName 事件名称，可选参数，传了返回指定事件名称监听器，不传返回所有监听器
   */
  listeners<P extends keyof T>(eventName?: P) {
    if (eventName === undefined) return this._listeners;
    return this._listeners[eventName];
  }

  /**
   * 注销监听
   *
   * @param eventName 事件名称
   * @param listener 事件监听器，可选参数，传了移除指定监听器，不传移除全部监听器
   */
  off<P extends keyof T>(eventName: P, listener?: T[P]) {
    if (listener) {
      const listeners = this._listeners[eventName];
      if (listeners === null) return;

      this._listeners[eventName] = listeners.filter((_listener) => _listener !== listener);
    } else {
      this._listeners[eventName] = null;
      delete this._listeners[eventName];
    }
  }

  /**
   * 注册监听
   *
   * @param eventName 事件名称
   * @param listener 事件监听器
   * @returns 返回注销监听函数
   */
  on<P extends keyof T>(eventName: P, listener: T[P]) {
    const listeners = this._listeners[eventName] || [];

    if (listeners.length >= this._maxListener) {
      console.warn(`监听器 [${String(eventName)}] 的最大数量是${this._maxListener}，您已超出限制。`);
    }

    listeners.push(listener);
    this._listeners[eventName] = listeners;

    return () => {
      this.off(eventName, listener);
    };
  }

  /**
   * 注册一次性监听
   *
   * @param eventName 事件名称
   * @param listener 事件监听器
   */
  once<P extends keyof T>(eventName: P, listener: T[P]) {
    const off = this.on(eventName, ((...args) => {
      listener(...args);
      off();
    }) as T[P]);
  }

  /**
   * 设置监听器数量
   *
   * @param num 数量
   */
  setMaxListeners(num: number) {
    this._maxListener = num;
  }
}

const emitter = new EventEmitter();

export { EventEmitter, emitter };
