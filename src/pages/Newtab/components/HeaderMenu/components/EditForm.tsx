import { Form, Input, Modal } from 'antd';
import React, { useEffect, useState } from 'react';

import { t } from '@/i18n/translate';

interface Props {
  name?: string;
  onCancel: () => void;
  onOk: (data: { name: string }) => void;
  open: boolean;
}

const EditForm = (props: Props) => {
  const { open, onOk, onCancel, name = '' } = props;
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (open) {form.setFieldsValue({ name });}
  }, [form, name, open]);

  return (
    <Modal
      destroyOnHidden
      cancelText={t('cancel')}
      confirmLoading={confirmLoading}
      okText={t('confirm')}
      open={open}
      title={t('editPage')}
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
        <Form.Item label={t('pageName')} name="name" rules={[{ required: true, message: t('pageNameRequired') }]}>
          <Input autoComplete="off" maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditForm;
