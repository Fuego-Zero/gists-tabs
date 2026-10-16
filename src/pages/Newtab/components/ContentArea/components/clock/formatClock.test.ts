import assert from 'node:assert/strict';
import test from 'node:test';

import { formatClockTime, timeZoneLabel, timeZoneOptions } from './formatClock.ts';

const shanghaiMorning = new Date('2026-01-15T00:00:00Z');

test('中文界面用 24 小时制显示上海时间', () => {
  const result = formatClockTime('Asia/Shanghai', 'zh_CN', shanghaiMorning);
  assert.match(result.time, /08:00:00/);
  assert.match(result.date, /15/);
});

test('英文界面用 12 小时制显示同一时刻', () => {
  const result = formatClockTime('Asia/Shanghai', 'en', shanghaiMorning);
  assert.match(result.time, /08:00:00/);
  assert.match(result.time, /AM/);
});

test('时区名同时显示城市和通用时区名', () => {
  const label = timeZoneLabel('Asia/Shanghai', 'zh_CN');
  assert.match(label, /Shanghai/);
  assert.match(label, /中国/);
});

test('时区选项按地区分组', () => {
  const asia = timeZoneOptions('en').find((group) => group.label === 'Asia');
  assert.ok(asia?.options.some((item) => item.value === 'Asia/Shanghai'));
});
