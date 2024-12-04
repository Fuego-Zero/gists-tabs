// import { BASE_CONFIG_FILE_NAME, BASE_DESCRIPTION } from '@/config';
// import { createPage } from '@/utils/dataFactory';
import http from '@/utils/http';

// function jsonToString(json: any) {
//   return JSON.stringify(json, null, 2);
// }

/**
 * 检测token是否有效
 */
export const checkToken = (token: string) =>
  http.get('/gists', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

// export const getGists = () =>
//   http({
//     url: '/gists',
//     method: 'get',
//   });

// export const getGistBookmark = async (id) => {
//   const res = await http({
//     url: `/gists/${id}`,
//     method: 'get',
//   });

//   const {
//     files: {
//       [BASE_CONFIG_FILE_NAME]: { raw_url: rawUrl },
//     },
//   } = res;

//   return http({
//     url: rawUrl,
//     method: 'get',
//   });
// };

// export const initGistBookmark = () =>
//   http({
//     url: '/gists',
//     method: 'post',
//     data: {
//       description: BASE_DESCRIPTION,
//       public: false,
//       files: {
//         [BASE_CONFIG_FILE_NAME]: {
//           content: jsonToString({
//             pages: [createPage('首页')],
//           }),
//         },
//       },
//     },
//   });

// export const patchGistBookmark = (id, content) =>
//   http({
//     url: `/gists/${id}`,
//     method: 'patch',
//     data: {
//       files: {
//         [BASE_CONFIG_FILE_NAME]: {
//           content: jsonToString(content),
//         },
//       },
//     },
//   });
