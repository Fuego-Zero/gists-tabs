import { DownloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, theme, Tooltip } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';

import useGistsTabs from '@/hooks/useGistsTabs';
import { t } from '@/i18n/translate';
import { createBookmark } from '@/pages/Newtab/components/ContentArea/components/Bookmark/dataFactory';
import { getCurrentTab } from '@/utils/chrome/tabs';

interface Option {
  children?: Option[];
  col?: number;
  label: string;
  value: string;
}

interface FormValues {
  favIconUrl: string;
  title: string;
  url: string;
  widget?: string[];
}

interface WidgetPickerProps {
  onChange?: (value?: string[]) => void;
  options: Option[];
  value?: string[];
}

interface PickTagProps {
  active?: boolean;
  fixedWidth?: boolean;
  label: string;
  onClick: () => void;
}

const tagClassName =
  'm-0 inline-flex shrink-0 cursor-pointer items-center rounded-md border px-2.5 py-1 text-sm leading-5 transition-colors';

const PickTag = ({ active = false, fixedWidth = false, label, onClick }: PickTagProps) => (
  <Tooltip mouseEnterDelay={0.4} title={label}>
    <button
      className={classNames(tagClassName, {
        'w-full min-w-0': fixedWidth,
        'max-w-[120px]': !fixedWidth,
        'border-[#1677ff] bg-[#e6f4ff] text-[#1677ff]': active,
        'border-current/20 bg-current/5 text-inherit hover:border-[#1677ff] hover:text-[#1677ff]': !active,
      })}
      type="button"
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
    </button>
  </Tooltip>
);

const WidgetPicker = ({ options, value, onChange }: WidgetPickerProps) => {
  const { status } = Form.Item.useStatus();
  const [activePageId, setActivePageId] = useState(value?.[0] ?? options[0]?.value);
  const widgets = options.find((page) => page.value === activePageId)?.children ?? [];

  useEffect(() => {
    if (!activePageId && options[0]?.value) {
      setActivePageId(options[0].value);
    }
  }, [activePageId, options]);

  return (
    <div
      className={classNames('flex min-h-0 flex-1 flex-col gap-3 rounded-lg border p-3', {
        'border-[#ff4d4f]': status === 'error',
        'border-current/20': status !== 'error',
      })}
    >
      <div className="shrink-0">
        <div className="mb-2 text-xs opacity-45">{t('page')}</div>
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {options.map((page) => (
            <PickTag
              key={page.value}
              active={page.value === activePageId}
              label={page.label}
              onClick={() => {
                setActivePageId(page.value);
                if (value?.[0] !== page.value) {
                  onChange?.(undefined);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 shrink-0 text-xs opacity-45">{t('bookmarkGroup')}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {widgets.length ? (
            <div className="grid grid-cols-3 grid-flow-col gap-2">
              {widgets.map((widget) => (
                <div key={widget.value} style={{ gridColumn: (widget.col ?? 0) + 1 }}>
                  <PickTag
                    fixedWidth
                    active={value?.[0] === activePageId && value?.[1] === widget.value}
                    label={widget.label}
                    onClick={() => {
                      if (!activePageId) {return;}

                      onChange?.([activePageId, widget.value]);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-sm opacity-45">{t('noBookmarkGroup')}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Popup = () => {
  const { token } = theme.useToken();
  const [gistsTabs, setGistsTabs] = useGistsTabs();
  const [form] = Form.useForm();

  const options = useMemo<Option[]>(
    () =>
      gistsTabs.pages.reduce((arr, item) => {
        const { id, name, widgets } = item;
        const bookmarkWidgets = widgets
          .filter((widget) => widget.type === 'bookmarks')
          .slice()
          .sort((a, b) => a.col - b.col || a.row - b.row)
          .map((widget) => ({
            col: widget.col,
            label: widget.name,
            value: widget.id,
          }));

        if (!bookmarkWidgets.length) {return arr;}

        arr.push({
          label: name,
          value: id,
          children: bookmarkWidgets,
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
      const [pageId, widgetId] = values.widget ?? [];
      const widget = gistsTabs.pages
        .find((page) => page.id === pageId)
        ?.widgets.find((widget) => widget.id === widgetId);

      if (!widget) {return;}

      if (widget.type !== 'bookmarks') {return;}

      const bookmark = createBookmark({
        icon: values.favIconUrl,
        title: values.title,
        url: values.url,
      });
      widget.data.bookmarks.push(bookmark);

      // 先等存储写完再关弹窗，否则页面卸载会丢掉这次添加。
      await setGistsTabs(gistsTabs);
      window.close();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="flex h-full w-full flex-col" style={{ background: token.colorBgContainer, color: token.colorText }}>
      <div className="shrink-0 border-b border-current/10 px-6 py-4 text-base font-medium">{t('addBookmark')}</div>

      <Form requiredMark className="flex min-h-0 flex-1 flex-col" form={form} layout="vertical">
        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-4">
          <Form.Item className="shrink-0" label={t('title')} name="title" rules={[{ required: true, message: t('titleRequired') }]}>
            <Input.TextArea rows={2} style={{ resize: 'none' }} />
          </Form.Item>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 shrink-0 text-sm">
              <span className="mr-1 text-[#ff4d4f]">*</span>
              {t('bookmark')}
            </div>
            <Form.Item
              noStyle
              name="widget"
              rules={[
                {
                  validator: (_, selected) =>
                    selected?.length === 2 ? Promise.resolve() : Promise.reject(new Error(t('pickBookmark'))),
                },
              ]}
              validateTrigger={[]}
            >
              <WidgetPicker options={options} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {() => {
                const error = form.getFieldError('widget')[0];
                return error ? <div className="mt-1 shrink-0 text-sm text-[#ff4d4f]">{error}</div> : null;
              }}
            </Form.Item>
          </div>

          <Form.Item hidden name="url">
            <Input />
          </Form.Item>
          <Form.Item hidden name="favIconUrl">
            <Input />
          </Form.Item>
        </div>
      </Form>

      <div className="shrink-0 border-t border-current/10 px-6 py-3 text-center">
        <Button icon={<DownloadOutlined />} type="primary" onClick={onSave}>
          {t('saveBookmark')}
        </Button>
      </div>
    </div>
  );
};

export default Popup;
