import { CopyOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { App, Button, Col, Divider, Drawer, Form, Input, Row, Space } from 'antd';
import React, { useEffect } from 'react';

import { t } from '@/i18n/translate';

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
    if (data) {form.setFieldsValue(data);}
  }, [data, form]);

  return (
    <Drawer
      extra={
        <Space>
          <Button
            type="primary"
            onClick={async () => {
              await form.validateFields();
              if (data?.id) {updateBookmark(data.id, form.getFieldsValue());}
            }}
          >
            {t('save')}
          </Button>
        </Space>
      }
      open={isOpen}
      title={t('editBookmark')}
      width={450}
      onClose={onClose}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={t('title')}
              name="title"
              rules={[
                {
                  required: true,
                  message: t('titleRequired'),
                },
              ]}
            >
              <Input.TextArea autoSize autoComplete="off" placeholder={t('titleRequired')} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label={t('url')}
              name="url"
              rules={[
                {
                  required: true,
                  message: t('urlRequired'),
                },
              ]}
            >
              <Input.TextArea autoSize autoComplete="off" placeholder={t('urlPlaceholder')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <Divider plain titlePlacement="left">
        {t('options')}
      </Divider>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          block
          icon={<CopyOutlined />}
          onClick={() => {
            if (data?.id) {copyBookmark(data.id);}
          }}
        >
          {t('copyBookmark')}
        </Button>
        <Button
          block
          icon={<DragOutlined />}
          onClick={() => {
            message.info(t('developing'));
          }}
        >
          {t('moveBookmark')}
        </Button>
        <Button
          block
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            if (data?.id) {deleteBookmark(data.id);}
          }}
        >
          {t('deleteBookmark')}
        </Button>
      </Space>
    </Drawer>
  );
};

export default EditDetail;
