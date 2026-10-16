import { ExclamationCircleFilled } from '@ant-design/icons';
import { App, type FormInstance, notification  } from 'antd';
import React from 'react';

import { t } from '@/i18n/translate';

import { createBookmark } from '../dataFactory';
import type { BookmarkHandler, BookmarkProps } from '../types';
import { analyzeURL } from '../utils';

interface Params {
  data: BookmarkProps['data'];
  editWidget: BookmarkProps['editWidget'];
  form: FormInstance;
  id: BookmarkProps['id'];
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  unselectBookmark: () => void;
}

export default function useBookmarkHandler({
  editWidget,
  id,
  data,
  form,
  unselectBookmark,
  setLoading,
}: Params): BookmarkHandler {
  const {
    message,
    modal: { confirm },
  } = App.useApp();

  const addBookmark: BookmarkHandler['addBookmark'] = async (url) => {
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
        message: t('addFail'),
        description: message as string,
      });

      console.error(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBookmark: BookmarkHandler['deleteBookmark'] = (bookmarkId, force) => {
    function onOk() {
      const filteredData = data.bookmarks.filter((item) => item.id !== bookmarkId);

      form.setFieldValue('bookmarks', filteredData);
      editWidget(id, { data: { ...data, bookmarks: filteredData } });

      unselectBookmark();
      message.success(t('deleteOk'));
    }

    if (force) {return onOk();}

    confirm({
      title: t('deleteConfirm'),
      icon: <ExclamationCircleFilled />,
      content: t('deleteDataShort'),
      okType: 'danger',
      onOk,
    });
  };

  const updateBookmark: BookmarkHandler['updateBookmark'] = (bookmarkId, newData) => {
    const target = data.bookmarks.find((item) => item.id === bookmarkId);
    if (!target) {return;}

    Object.assign(target, newData);

    form.setFieldValue('bookmarks', data.bookmarks);
    editWidget(id, { data });

    unselectBookmark();
    message.success(t('editOk'));
  };

  const copyBookmark: BookmarkHandler['copyBookmark'] = (bookmarkId) => {
    const target = data.bookmarks.find((item) => item.id === bookmarkId);
    if (!target) {return;}

    const copied = createBookmark({ icon: target.icon, title: target.title, url: target.url });
    data.bookmarks.push(copied);

    form.setFieldValue('bookmarks', data.bookmarks);
    editWidget(id, { data });

    message.success(t('copyOk'));
  };

  return {
    addBookmark,
    deleteBookmark,
    updateBookmark,
    copyBookmark,
  };
}
