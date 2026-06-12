type LogValue = boolean | null | number | number[] | string;

const LOG_PREFIX = '[gists-tabs:sort-dnd]';
const VERBOSE_LOG_KEY = 'gists-tabs:sort-dnd-debug';

export const roundMs = (value: number) => Number(value.toFixed(2));

const isVerboseEnabled = () => window.localStorage.getItem(VERBOSE_LOG_KEY) === '1';

const formatLog = (label: string, values: Record<string, LogValue>) =>
  `${LOG_PREFIX} ${label} ${Object.entries(values)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? `[${value.join(',')}]` : value}`)
    .join(' ')}`;

export const infoSortDndLog = (label: string, values: Record<string, LogValue>, options?: { verbose?: boolean }) => {
  if (options?.verbose && !isVerboseEnabled()) return;

  console.info(formatLog(label, values));
};

export const warnSortDndLog = (label: string, values: Record<string, LogValue>, options?: { verbose?: boolean }) => {
  if (options?.verbose && !isVerboseEnabled()) return;

  console.warn(formatLog(label, values));
};
