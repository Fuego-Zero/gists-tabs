import { type FeedbackInstance, init } from '@echo-feedback/sdk';
import { useCallback, useEffect, useRef } from 'react';

import { echoProjectAk, echoProjectVersion, echoServerUrl, toEchoLocale } from '@/feedback/echoConfig';
import { useLocale } from '@/hooks/useLocale';

/** 当前扩展页持有一个回声实例。面板固定亮色，语言变化只改文案。 */
export function useEchoFeedback() {
  const locale = useLocale();
  const echoLocale = toEchoLocale(locale);
  const instance = useRef<FeedbackInstance | null>(null);

  useEffect(() => {
    const feedback = init({
      ak: echoProjectAk,
      locale: echoLocale,
      onError: (error) => {
        console.warn('回声 SDK 异常', error.message);
      },
      projectVersion: echoProjectVersion,
      serverUrl: echoServerUrl,
      showTrigger: false,
      theme: 'light',
      uiStyle: 'classic',
    });
    instance.current = feedback;
    return () => {
      instance.current = null;
      feedback.destroy();
    };
    // 只在挂载时初始化。换语言走 setLocale，避免销毁后丢掉未提交草稿。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初始化只做一次
  }, []);

  useEffect(() => {
    instance.current?.setLocale(echoLocale);
  }, [echoLocale]);

  return useCallback(() => {
    instance.current?.open({
      locale: echoLocale,
      projectVersion: echoProjectVersion,
    });
  }, [echoLocale]);
}
