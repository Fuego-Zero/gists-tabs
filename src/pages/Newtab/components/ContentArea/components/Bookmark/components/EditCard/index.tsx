import { App, Button, Divider, Form, Input, Space } from 'antd';
import React, { useState } from 'react';

import { t } from '@/i18n/translate';

import type { Bookmark } from '@/types/widget/bookmark';

import type { BookmarkHandler } from '../../types';

type Props = {
  onSave: () => void;
  selectBookmark: (id: string) => void;
} & Pick<BookmarkHandler, 'addBookmark'>;

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
                rules={[{ required: true, message: t('titleRequired') }]}
              >
                <Input autoComplete="off" placeholder={t('titleRequired')} />
              </Form.Item>
              <Button
                onClick={() => {
                  const row = form.getFieldValue(['bookmarks', field.name]) as Bookmark;
                  selectBookmark(row.id);
                }}
              >
                {t('edit')}
              </Button>
            </Space.Compact>
          ))
        }
      </Form.List>
      <Divider className="m-0" />
      <div className="mt-[10px]">
        <Space.Compact className="w-full">
          <Input
            placeholder={t('urlPlaceholder')}
            value={inputURLValue}
            onChange={(e) => {
              setInputURLValue(e.target.value);
            }}
          />
          <Button
            onClick={() => {
              let url = inputURLValue.trim();
              if (!url) {return message.warning(t('urlRequired'));}

              // 用户通常不会手输协议，默认补 https 让 URL 解析和打开行为一致。
              url = url.startsWith('http') ? url : `https://${url}`;
              addBookmark(url);
              setInputURLValue('');
            }}
          >
            {t('add')}
          </Button>
        </Space.Compact>
        <Button block className="mt-[10px]" onClick={onSave}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
};

export default EditCard;
