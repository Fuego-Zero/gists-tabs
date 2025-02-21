import React, { useCallback, useEffect, useState } from 'react';

import { ExclamationCircleFilled, SmallDashOutlined } from '@ant-design/icons';
import { App, Card, Form, Input, Spin, notification } from 'antd';

import EditCard from './components/EditCard';
import EditDetail from './components/EditDetail';
import ExtraCard from './components/ExtraCard';
import ShowCard from './components/ShowCard';
import { createBookmark } from './dataFactory';
import useDetailHandler from './hooks/useDetailHandler';
import { analyzeURL } from './utils';

import type { BookmarkData, BookmarkId, BookmarkProps } from './types';

const Bookmark = (props: BookmarkProps) => {
  const { id, name, data, delWidget, copyWidget, editWidget } = props;
  const {
    message,
    modal: { confirm },
  } = App.useApp();

  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
  }, [form, isEditMode]);

  async function onSave() {
    try {
      setLoading(true);
      const fields = await form.validateFields();
      editWidget(id, fields);
      setIsEditMode(false);
      message.success('保存成功');
    } catch (error) {
      const { errorFields }: { errorFields: { errors: string[] }[] } = error as any;

      errorFields.forEach(({ errors: [description] }) => {
        notification.error({
          message: '保存失败',
          description,
        });
      });

      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function addBookmark(url: string) {
    try {
      setLoading(true);

      const { icon, title } = await analyzeURL(url);
      const bookmark = createBookmark({ title, icon, url });

      data.bookmarks.push(bookmark);
      editWidget(id, { data });
      form.setFieldValue('bookmarks', data.bookmarks);
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
  }

  const { isOpen, selectBookmark, unselectBookmark, selectedBookmark } = useDetailHandler(data);

  const deleteBookmark = useCallback(
    (bookmarkId: BookmarkId) => {
      confirm({
        title: '您确定要删除吗?',
        icon: <ExclamationCircleFilled />,
        content: '删除后数据消失',
        okType: 'danger',
        onOk() {
          const filteredData = data.bookmarks.filter((item) => item.id !== bookmarkId);

          form.setFieldValue('bookmarks', filteredData);
          editWidget(id, { data: { ...data, bookmarks: filteredData } });

          unselectBookmark();
          message.success('删除成功');
        },
      });
    },
    [confirm, data, editWidget, form, id, message, unselectBookmark],
  );

  const updateBookmark = useCallback(
    (bookmarkId: BookmarkId, newData: BookmarkData) => {
      const target = data.bookmarks.find((item) => item.id === bookmarkId);
      if (!target) return;

      Object.assign(target, newData);

      form.setFieldValue('bookmarks', data.bookmarks);
      editWidget(id, { data });

      unselectBookmark();
      message.success('编辑成功');
    },
    [data, editWidget, form, id, message, unselectBookmark],
  );

  const copyBookmark = useCallback(
    (bookmarkId: BookmarkId) => {
      const target = data.bookmarks.find((item) => item.id === bookmarkId);
      if (!target) return;

      const copied = createBookmark({ icon: target.icon, title: target.title, url: target.url });
      data.bookmarks.push(copied);

      form.setFieldValue('bookmarks', data.bookmarks);
      editWidget(id, { data });

      message.success('复制成功');
    },
    [data, editWidget, form, id, message],
  );

  const toggleExpand = useCallback(() => {
    data.expanded = !data.expanded;
    editWidget(id, { data });
  }, [data, editWidget, id]);

  return (
    <>
      <Spin spinning={loading} tip="执行中...">
        <Form form={form} initialValues={{ name, bookmarks: data.bookmarks }}>
          <Card
            extra={
              <ExtraCard
                copyWidget={() => {
                  copyWidget(id);
                }}
                delWidget={() => {
                  confirm({
                    title: '您确定要删除吗?',
                    icon: <ExclamationCircleFilled />,
                    content: '删除后所有数据都会消失',
                    okType: 'danger',
                    async onOk() {
                      delWidget(id);
                      message.success('删除成功');
                    },
                  });
                }}
                switchMode={() => {
                  setIsEditMode((value) => !value);
                }}
                expanded={data.expanded}
                toggleExpand={toggleExpand}
              />
            }
            title={
              isEditMode ? (
                <div className="mr-[5px]">
                  <Form.Item noStyle name="name">
                    <Input autoComplete="off" placeholder="请输入名称" />
                  </Form.Item>
                </div>
              ) : (
                name
              )
            }
            size="small"
          >
            {isEditMode ? (
              <EditCard addBookmark={addBookmark} selectBookmark={selectBookmark} onSave={onSave} />
            ) : (
              <>
                {data.expanded ? (
                  <ShowCard copyBookmark={copyBookmark} data={data} deleteBookmark={deleteBookmark} />
                ) : (
                  <div className="text-center cursor-pointer" onClick={toggleExpand}>
                    <SmallDashOutlined />
                  </div>
                )}
              </>
            )}
          </Card>
        </Form>
      </Spin>
      <EditDetail
        copyBookmark={copyBookmark}
        data={selectedBookmark}
        deleteBookmark={deleteBookmark}
        isOpen={isOpen}
        updateBookmark={updateBookmark}
        onClose={unselectBookmark}
      />
    </>
  );
};

export default Bookmark;
