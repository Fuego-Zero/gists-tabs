import React, { useState } from 'react';

import { Form, Input, Modal } from 'antd';

type Props = {
  name?: string;
  onCancel: () => void;
  onOk: (data: { name: string }) => void;
  open: boolean;
};

const EditForm = (props: Props) => {
  const { open, onOk, onCancel, name = '' } = props;
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  return (
    <Modal
      cancelText="取消"
      confirmLoading={confirmLoading}
      okText="确认"
      open={open}
      title="编辑页面"
      onCancel={onCancel}
      onOk={async () => {
        setConfirmLoading(true);

        form
          .validateFields()
          .then((values) => {
            onOk(values);
            form.resetFields();
            setConfirmLoading(false);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
            setConfirmLoading(false);
          });
      }}
    >
      <Form form={form} layout="vertical" name="form">
        <Form.Item
          initialValue={name}
          label="页面名称"
          name="name"
          rules={[{ required: true, message: '请输入页面名称' }]}
        >
          <Input maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditForm;
