import axios, { type AxiosError, type AxiosResponse } from 'axios';

import { GISTS_FILE_DESCRIPTION, GISTS_FILE_NAME } from '@/config';
import { parseCanvas } from '@/storage/syncRules';
import type { GistsTabs } from '@/types';

const github = axios.create({
  // GitHub 读取 Gist 返回 max-age=60，走浏览器缓存会让推前检查看到一分钟前的云端。
  adapter: 'fetch',
  baseURL: 'https://api.github.com',
  fetchOptions: { cache: 'no-store' },
  timeout: 15000,
  validateStatus: () => true,
});

const LIST_PAGE_SIZE = 100;
/** 防止异常的 Link 头让翻页停不下来。 */
const LIST_MAX_PAGES = 50;

export interface GitHubRateInfo {
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export type GitHubErrorKind = 'auth' | 'http' | 'invalid' | 'network' | 'not_found' | 'not_modified' | 'ok' | 'rate_limit';

/** `invalid` 结果的 message 取值，供调用方映射成用户可读的错误。 */
export type GistInvalidReason = 'json' | 'shape' | 'truncated';

export interface GitHubResult<T> {
  data?: T;
  errorKind: GitHubErrorKind;
  etag: null | string;
  message?: string;
  rate: GitHubRateInfo;
  status: number;
}

function parseRate(headers: Record<string, unknown>): GitHubRateInfo {
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  const retryAfter = headers['retry-after'];
  return {
    remaining: remaining !== undefined ? Number(remaining) : undefined,
    reset: reset !== undefined ? Number(reset) * 1000 : undefined,
    retryAfter: retryAfter !== undefined ? Number(retryAfter) * 1000 : undefined,
  };
}

function classifyStatus(status: number): GitHubErrorKind {
  if (status === 200 || status === 201) {return 'ok';}

  if (status === 304) {return 'not_modified';}

  if (status === 401) {return 'auth';}

  if (status === 404) {return 'not_found';}

  if (status === 403 || status === 429) {return 'rate_limit';}

  return 'http';
}

function fromResponse<T>(res: AxiosResponse, data?: T): GitHubResult<T> {
  const headers = res.headers as Record<string, unknown>;
  const etag = typeof headers.etag === 'string' ? headers.etag : null;
  const errorKind = classifyStatus(res.status);
  const message =
    typeof res.data === 'object' && res.data && 'message' in res.data
      ? String((res.data as { message: string }).message)
      : undefined;
  return { data, errorKind, etag, message, rate: parseRate(headers), status: res.status };
}

function invalidResult(res: AxiosResponse, reason: GistInvalidReason): GitHubResult<never> {
  return { ...fromResponse(res), errorKind: 'invalid', message: reason };
}

function fromNetworkError(error: unknown): GitHubResult<never> {
  const ax = error as AxiosError;
  return {
    errorKind: 'network',
    etag: null,
    message: ax.message || 'network error',
    rate: {},
    status: 0,
  };
}

function authHeader(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
}

function hasNextPage(res: AxiosResponse, pageLength: number): boolean {
  const link = (res.headers as Record<string, unknown>).link;
  if (typeof link === 'string') {return link.includes('rel="next"');}

  return pageLength === LIST_PAGE_SIZE;
}

function parseGistContent(resData: unknown): { data: GistsTabs } | { invalid: GistInvalidReason } {
  const files = (resData as { files?: Record<string, { content?: string; truncated?: boolean }> })?.files;
  const file = files?.[GISTS_FILE_NAME];
  // 超过 1MB 的文件 content 只有前一部分，解析出来也是残缺数据。
  if (file?.truncated) {return { invalid: 'truncated' };}

  if (!file?.content) {
    return { data: { pages: [], updateAt: -1, version: 1 } };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(file.content);
  } catch {
    return { invalid: 'json' };
  }

  const data = parseCanvas(raw);
  return data ? { data } : { invalid: 'shape' };
}

export async function githubGetGist(
  token: string,
  id: string,
  options?: { etag?: null | string },
): Promise<GitHubResult<GistsTabs>> {
  try {
    const headers: Record<string, string> = { ...authHeader(token) };
    if (options?.etag) {headers['If-None-Match'] = options.etag;}

    const res = await github.get(`/gists/${id}`, { headers });
    if (res.status !== 200) {return fromResponse(res);}

    const parsed = parseGistContent(res.data);
    if ('invalid' in parsed) {return invalidResult(res, parsed.invalid);}

    return fromResponse(res, parsed.data);
  } catch (error) {
    return fromNetworkError(error);
  }
}

export async function githubListGists(
  token: string,
): Promise<GitHubResult<{ description: string; id: string }[]>> {
  try {
    const list: { description: string; id: string }[] = [];
    for (let page = 1; ; page += 1) {
      const res = await github.get('/gists', {
        headers: authHeader(token),
        params: { page, per_page: LIST_PAGE_SIZE },
      });
      if (res.status !== 200) {return fromResponse(res);}

      const items = res.data as { description: string; id: string }[];
      list.push(...items.map((item) => ({ description: item.description, id: item.id })));
      if (page >= LIST_MAX_PAGES || !hasNextPage(res, items.length)) {return fromResponse(res, list);}
    }
  } catch (error) {
    return fromNetworkError(error);
  }
}

export async function githubCreateGist(token: string, content: GistsTabs): Promise<GitHubResult<{ id: string }>> {
  try {
    const res = await github.post(
      '/gists',
      {
        description: GISTS_FILE_DESCRIPTION,
        files: {
          [GISTS_FILE_NAME]: {
            content: JSON.stringify(content, null, 2),
          },
        },
        public: false,
      },
      { headers: authHeader(token) },
    );
    if (res.status !== 201 && res.status !== 200) {return fromResponse(res);}

    return fromResponse(res, { id: (res.data as { id: string }).id });
  } catch (error) {
    return fromNetworkError(error);
  }
}

/** Gist 的 PATCH 不接受 If-Match，带上会直接 400；并发覆盖只能靠推后再 GET 核对。 */
export async function githubPatchGist(token: string, id: string, content: GistsTabs): Promise<GitHubResult<never>> {
  try {
    const res = await github.patch(
      `/gists/${id}`,
      {
        files: {
          [GISTS_FILE_NAME]: {
            content: JSON.stringify(content, null, 2),
          },
        },
      },
      { headers: authHeader(token) },
    );
    return fromResponse(res);
  } catch (error) {
    return fromNetworkError(error);
  }
}
