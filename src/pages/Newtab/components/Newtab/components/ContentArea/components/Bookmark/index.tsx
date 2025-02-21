import React, { useCallback, useEffect, useState } from 'react';

import { ExclamationCircleFilled, SmallDashOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Spin, notification } from 'antd';

import EditCard from './components/EditCard';
import EditDetail from './components/EditDetail';
import ExtraCard from './components/ExtraCard';
import ShowCard from './components/ShowCard';
import useBookmarkHandler from './hooks/useBookmarkHandler';
import useDetailHandler from './hooks/useDetailHandler';

import type { BookmarkProps } from './types';

const Bookmark = (props: BookmarkProps) => {
  const { id, name, data, delWidget, copyWidget, editWidget, moveWidgetToPageModal } = props;
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

  const { isOpen, selectBookmark, unselectBookmark, selectedBookmark } = useDetailHandler(data);
  const { addBookmark, copyBookmark, deleteBookmark, updateBookmark } = useBookmarkHandler({
    editWidget,
    id,
    data,
    form,
    unselectBookmark,
    setLoading,
  });

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
                moveWidgetToPageModal={() => {
                  moveWidgetToPageModal(id);
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
                  <div className="text-center">
                    <Button icon={<SmallDashOutlined />} shape="circle" type="text" onClick={toggleExpand} />
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
