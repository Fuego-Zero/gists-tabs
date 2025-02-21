import React, { useEffect, useMemo } from 'react';

import { DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Cascader, Form, Input } from 'antd';

import useGistsTabs from '@/hooks/useGistsTabs';
import { createBookmark } from '@/pages/Newtab/components/Newtab/components/ContentArea/components/Bookmark/dataFactory';
import { getCurrentTab } from '@/utils/chrome/tabs';

type Option = {
  children?: Option[];
  label: string;
  value: string;
};

type FormValues = {
  favIconUrl: string;
  title: string;
  url: string;
  widget: string[];
};

const Popup = () => {
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [form] = Form.useForm();

  const options = useMemo<Option[]>(
    () =>
      gistsTabs.pages.reduce((arr, item) => {
        const { id, name, widgets } = item;

        arr.push({
          label: name,
          value: id,
          children: widgets
            .filter((widget) => widget.type === 'bookmarks')
            .map((widget) => ({ label: widget.name, value: widget.id })),
        });

        return arr;
      }, [] as Option[]),
    [gistsTabs.pages],
  );

  useEffect(() => {
    getCurrentTab().then((tab) => {
      const { title = '', url = '', favIconUrl = ' ' } = tab;
      form.setFieldsValue({ title, url, favIconUrl });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSave() {
    try {
      const values: FormValues = await form.validateFields();
      const widget = gistsTabs.pages
        .find((page) => page.id === values.widget[0])
        ?.widgets.find((widget) => widget.id === values.widget[1]);

      if (!widget) return;
      if (widget.type !== 'bookmarks') return;

      const bookmark = createBookmark({
        icon: values.favIconUrl,
        title: values.title,
        url: values.url,
      });
      widget.data.bookmarks.push(bookmark);

      setGistsTabs(gistsTabs);
      window.close();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Card
      actions={[
        <Button icon={<DownloadOutlined />} type="primary" onClick={onSave}>
          保存书签
        </Button>,
      ]}
      bordered={false}
      className="w-[500px]"
      title="添加书签"
    >
      <div className="h-[400px]">
        <Form form={form}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input.TextArea rows={4} style={{ resize: 'none' }} />
          </Form.Item>
          <Form.Item label="书签" name="widget" rules={[{ required: true, message: '请选择书签' }]}>
            <Cascader allowClear={false} expandTrigger="hover" options={options} />
          </Form.Item>
          <Form.Item name="url">
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="favIconUrl">
            <Input type="hidden" />
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
};

export default Popup;
