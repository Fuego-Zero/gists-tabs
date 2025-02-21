import React from 'react';

import { ExclamationCircleFilled } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { App, notification } from 'antd';

import { createBookmark } from '../dataFactory';
import { analyzeURL } from '../utils';

import type { BookmarkProps, CopyBookmark, DeleteBookmark, UpdateBookmark } from '../types';

type Params = {
  data: BookmarkProps['data'];
  editWidget: BookmarkProps['editWidget'];
  form: FormInstance;
  id: BookmarkProps['id'];
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  unselectBookmark: () => void;
};

export default function useBookmarkHandler({ editWidget, id, data, form, unselectBookmark, setLoading }: Params) {
  const {
    message,
    modal: { confirm },
  } = App.useApp();

  const addBookmark = async (url: string) => {
    try {
      setLoading(true);

      const { icon, title } = await analyzeURL(url);
      const bookmark = createBookmark({ title, icon, url });

      data.bookmarks.push(bookmark);

      editWidget(id, { data });
      form.setFieldValue('bookmarks', data.bookmarks);
      const res = await form.getFieldsValue();
      console.log(res);
    } catch (error) {
      const message = await error;

      notification.error({
        message: '添加失败',
        description: message as string,
      });

      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBookmark: DeleteBookmark = (bookmarkId, force) => {
    function onOk() {
      const filteredData = data.bookmarks.filter((item) => item.id !== bookmarkId);

      form.setFieldValue('bookmarks', filteredData);
      editWidget(id, { data: { ...data, bookmarks: filteredData } });

      unselectBookmark();
      message.success('删除成功');
    }

    if (force) return onOk();

    confirm({
      title: '您确定要删除吗?',
      icon: <ExclamationCircleFilled />,
      content: '删除后数据消失',
      okType: 'danger',
      onOk,
    });
  };

  const updateBookmark: UpdateBookmark = (bookmarkId, newData) => {
    const target = data.bookmarks.find((item) => item.id === bookmarkId);
    if (!target) return;

    Object.assign(target, newData);

    form.setFieldValue('bookmarks', data.bookmarks);
    editWidget(id, { data });

    unselectBookmark();
    message.success('编辑成功');
  };

  const copyBookmark: CopyBookmark = (bookmarkId) => {
    const target = data.bookmarks.find((item) => item.id === bookmarkId);
    if (!target) return;

    const copied = createBookmark({ icon: target.icon, title: target.title, url: target.url });
    data.bookmarks.push(copied);

    form.setFieldValue('bookmarks', data.bookmarks);
    editWidget(id, { data });

    message.success('复制成功');
  };

  return {
    addBookmark,
    deleteBookmark,
    updateBookmark,
    copyBookmark,
  };
}
