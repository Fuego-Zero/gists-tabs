import assert from 'node:assert/strict';
import test from 'node:test';

import { toEchoLocale } from './echoConfig.ts';

test('简体和繁体都交给回声的简体中文', () => {
  assert.equal(toEchoLocale('zh_CN'), 'zh-CN');
  assert.equal(toEchoLocale('zh_TW'), 'zh-CN');
});

test('其余界面语言交给回声的英文', () => {
  for (const locale of ['en', 'ja', 'ko', 'es', 'pt_BR', 'de', 'fr', 'ru'] as const) {
    assert.equal(toEchoLocale(locale), 'en');
  }
});
