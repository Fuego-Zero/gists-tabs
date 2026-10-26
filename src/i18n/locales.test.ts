import assert from 'node:assert/strict';
import test from 'node:test';

import { matchLocale } from './locales.ts';

test('中文地区按简繁区分，其余中文归简体', () => {
  assert.equal(matchLocale('zh-CN'), 'zh_CN');
  assert.equal(matchLocale('zh'), 'zh_CN');
  assert.equal(matchLocale('zh-Hans'), 'zh_CN');
  assert.equal(matchLocale('zh-TW'), 'zh_TW');
  assert.equal(matchLocale('zh-HK'), 'zh_TW');
  assert.equal(matchLocale('zh-MO'), 'zh_TW');
  assert.equal(matchLocale('zh-Hant'), 'zh_TW');
});

test('葡萄牙语统一用巴西葡萄牙语', () => {
  assert.equal(matchLocale('pt-BR'), 'pt_BR');
  assert.equal(matchLocale('pt-PT'), 'pt_BR');
  assert.equal(matchLocale('pt'), 'pt_BR');
});

test('按语言前缀匹配，下划线标签同样识别', () => {
  assert.equal(matchLocale('ja-JP'), 'ja');
  assert.equal(matchLocale('ko_KR'), 'ko');
  assert.equal(matchLocale('es-MX'), 'es');
  assert.equal(matchLocale('de-AT'), 'de');
  assert.equal(matchLocale('fr-CA'), 'fr');
  assert.equal(matchLocale('ru'), 'ru');
  assert.equal(matchLocale('en-GB'), 'en');
});

test('匹配不到时用英文', () => {
  assert.equal(matchLocale('ar'), 'en');
  assert.equal(matchLocale(''), 'en');
  assert.equal(matchLocale('th-TH'), 'en');
});
