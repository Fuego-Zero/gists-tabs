import { GISTS_FILE_DESCRIPTION, GISTS_FILE_NAME } from '@/config';
import http from '@/utils/http';

import type { GistsTabs } from '@/types';
import type { Gists } from '@/types/gists';
import type { InferArrayItem } from '@/types/utils';

/**
 * 检测 token 是否有效
 */
export const checkToken = (token: string) =>
  http.get('/gists', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

/**
 * 获取所有的 gists
 */
export const getAllGists = (): Promise<Gists> =>
  http({
    url: '/gists',
    method: 'get',
  });

/**
 *  初始化 gistsId
 */
export const initGistsId = async (): Promise<string> => {
  const res: InferArrayItem<Gists> = await http({
    url: '/gists',
    method: 'post',
    data: {
      description: GISTS_FILE_DESCRIPTION,
      public: false,
      files: {
        [GISTS_FILE_NAME]: {
          content: JSON.stringify({
            updateAt: Date.now(),
          }),
        },
      },
    },
  });

  return res.id;
};

/**
 * 获取 gists 数据
 */
export const getGists = async (id: string): Promise<GistsTabs> => {
  const res: InferArrayItem<Gists> = await http({
    url: `/gists/${id}`,
    method: 'get',
  });

  const {
    files: {
      [GISTS_FILE_NAME]: { content },
    },
  } = res;

  return JSON.parse(content);
};

/**
 * 更新 gists 数据
 */
export const patchGists = (id: string, content: GistsTabs) =>
  http({
    url: `/gists/${id}`,
    method: 'patch',
    data: {
      files: {
        [GISTS_FILE_NAME]: {
          content: JSON.stringify(content),
        },
      },
    },
  });
