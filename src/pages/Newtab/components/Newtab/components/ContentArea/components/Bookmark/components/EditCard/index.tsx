import React, { useState } from 'react';

import { App, Button, Divider, Form, Input, Space } from 'antd';

import type { Bookmark } from '@/types/widget/bookmark';

type Props = {
  addBookmark: (url: string) => void;
  onSave: () => void;
  selectBookmark: (id: string) => void;
};

const EditCard = (props: Props) => {
  const { onSave, addBookmark, selectBookmark } = props;

  const [inputURLValue, setInputURLValue] = useState('');

  const { message } = App.useApp();

  const form = Form.useFormInstance();

  return (
    <div>
      <Form.List name="bookmarks">
        {(fields) =>
          fields.map((field) => (
            <Space.Compact key={field.key} block className="mb-[10px]">
              <Form.Item
                noStyle
                {...field}
                name={[field.name, 'title']}
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input autoComplete="off" placeholder="请输入标题" />
              </Form.Item>
              <Button
                onClick={() => {
                  const row = form.getFieldValue(['bookmarks', field.name]) as Bookmark;
                  selectBookmark(row.id);
                }}
              >
                编辑
              </Button>
            </Space.Compact>
          ))
        }
      </Form.List>
      <Divider className="m-0" />
      <div className="mt-[10px]">
        <Space.Compact className="w-full">
          <Input
            placeholder="请输入网址"
            value={inputURLValue}
            onChange={(e) => {
              setInputURLValue(e.target.value);
            }}
          />
          <Button
            onClick={() => {
              let url = inputURLValue.trim();
              if (!url) return message.warning('请输入网址');

              url = url.startsWith('http') ? url : `https://${url}`;
              addBookmark(url);
              setInputURLValue('');
            }}
          >
            添加
          </Button>
        </Space.Compact>
        <Button block className="mt-[10px]" onClick={onSave}>
          保存
        </Button>
      </div>
    </div>
  );
};

export default EditCard;
