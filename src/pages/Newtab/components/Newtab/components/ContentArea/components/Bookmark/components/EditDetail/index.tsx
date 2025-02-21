import React, { useEffect } from 'react';

import { CopyOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { App, Button, Col, Divider, Drawer, Form, Input, Row, Space } from 'antd';

import type { Bookmark } from '@/types/widget/bookmark';

import type { BookmarkHandler } from '../../types';

type Props = {
  data?: Bookmark;
  isOpen: boolean;
  onClose: () => void;
} & Omit<BookmarkHandler, 'addBookmark'>;

const EditDetail = (props: Props) => {
  const { isOpen, data, onClose, deleteBookmark, copyBookmark, updateBookmark } = props;

  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  return (
    <Drawer
      extra={
        <Space>
          <Button
            type="primary"
            onClick={async () => {
              await form.validateFields();
              if (data?.id) updateBookmark(data.id, form.getFieldsValue());
            }}
          >
            保存
          </Button>
        </Space>
      }
      open={isOpen}
      title="编辑书签"
      width={450}
      onClose={onClose}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              rules={[
                {
                  required: true,
                  message: '请输入标题',
                },
              ]}
              label="标题"
              name="title"
            >
              <Input.TextArea autoSize autoComplete="off" placeholder="请输入标题" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              rules={[
                {
                  required: true,
                  message: '请输入网址',
                },
              ]}
              label="网址"
              name="url"
            >
              <Input.TextArea autoSize autoComplete="off" placeholder="请输入网址" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <Divider plain orientation="left">
        选项
      </Divider>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          block
          icon={<CopyOutlined />}
          onClick={() => {
            if (data?.id) copyBookmark(data.id);
          }}
        >
          复制书签
        </Button>
        <Button
          block
          icon={<DragOutlined />}
          onClick={() => {
            message.info('开发中...');
          }}
        >
          移动书签
        </Button>
        <Button
          block
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            if (data?.id) deleteBookmark(data.id);
          }}
        >
          删除书签
        </Button>
      </Space>
    </Drawer>
  );
};

export default EditDetail;
