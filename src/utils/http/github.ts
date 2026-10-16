import axios, { type AxiosError, type AxiosResponse } from 'axios';

import { GISTS_FILE_DESCRIPTION, GISTS_FILE_NAME } from '@/config';
import type { GistsTabs } from '@/types';

const github = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  validateStatus: () => true,
});

export interface GitHubRateInfo {
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export type GitHubErrorKind = 'auth' | 'http' | 'network' | 'not_modified' | 'ok' | 'precondition' | 'rate_limit';

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

  if (status === 412) {return 'precondition';}

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

function parseGistContent(resData: unknown): GistsTabs {
  const files = (resData as { files?: Record<string, { content?: string }> })?.files;
  const content = files?.[GISTS_FILE_NAME]?.content;
  if (!content) {
    return { pages: [], updateAt: -1, version: 1 };
  }

  return JSON.parse(content) as GistsTabs;
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
    if (res.status === 304) {return fromResponse(res);}

    if (res.status !== 200) {return fromResponse(res);}

    return fromResponse(res, parseGistContent(res.data));
  } catch (error) {
    return fromNetworkError(error);
  }
}

export async function githubListGists(
  token: string,
): Promise<GitHubResult<{ description: string; id: string }[]>> {
  try {
    const res = await github.get('/gists', { headers: authHeader(token) });
    if (res.status !== 200) {return fromResponse(res);}

    const list = (res.data as { description: string; id: string }[]).map((item) => ({
      description: item.description,
      id: item.id,
    }));
    return fromResponse(res, list);
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

export async function githubPatchGist(
  token: string,
  id: string,
  content: GistsTabs,
  options?: { ifMatch?: null | string },
): Promise<GitHubResult<GistsTabs>> {
  try {
    const headers: Record<string, string> = { ...authHeader(token) };
    if (options?.ifMatch) {headers['If-Match'] = options.ifMatch;}

    const res = await github.patch(
      `/gists/${id}`,
      {
        files: {
          [GISTS_FILE_NAME]: {
            content: JSON.stringify(content, null, 2),
          },
        },
      },
      { headers },
    );
    if (res.status !== 200) {return fromResponse(res);}

    return fromResponse(res, parseGistContent(res.data));
  } catch (error) {
    return fromNetworkError(error);
  }
}
