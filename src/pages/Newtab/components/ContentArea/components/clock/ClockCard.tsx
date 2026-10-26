import { DeleteOutlined, EditOutlined, MenuOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Dropdown, Input, type MenuProps, Select } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';

import { useLocale } from '@/hooks/useLocale';
import { t } from '@/i18n/translate';
import type { Widget } from '@/types';
import type { Clocks } from '@/types/widget/clock';
import { createId } from '@/utils/data/factory';

import type { WidgetsHandler } from '../../../../types';
import { currentTimeZone, formatClockTime, timeZoneLabel, timeZoneOptions } from './formatClock';

interface Props {
  data: Clocks;
  dragHandleRef?: React.Ref<HTMLDivElement>;
  id: Widget['id'];
  isTitleDragging?: boolean;
  moveWidgetToPageModal: (widgetId: Widget['id']) => void;
  name: string;
  onTitleMouseDown?: React.MouseEventHandler<HTMLDivElement>;
}

type ClockCardProps = Props & Pick<WidgetsHandler, 'copyWidget' | 'delWidget' | 'editWidget'>;

const ClockCard = (props: ClockCardProps) => {
  const { copyWidget, data, delWidget, dragHandleRef, editWidget, id, isTitleDragging, moveWidgetToPageModal, name, onTitleMouseDown } = props;
  const locale = useLocale();
  const { message, modal } = App.useApp();
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [zone, setZone] = useState(currentTimeZone);
  const options = useMemo(() => timeZoneOptions(locale), [locale]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const saveName = () => {
    const next = draftName.trim();
    if (next && next !== name) {editWidget(id, { name: next });}
  };

  const addZone = () => {
    if (data.clocks.some((item) => item.timezone === zone)) {
      message.info(timeZoneLabel(zone, locale));
      return;
    }

    editWidget(id, { data: { clocks: [...data.clocks, { id: createId(), timezone: zone }] } });
  };

  const removeZone = (clockId: string) => {
    editWidget(id, { data: { clocks: data.clocks.filter((item) => item.id !== clockId) } });
  };

  const menu: MenuProps['items'] = [
    { key: 'copy', label: t('copy') },
    { key: 'move', label: t('move') },
    { key: 'delete', danger: true, label: t('delete') },
  ];

  return (
    <Card
      extra={
        <>
          <Button icon={<EditOutlined />} size="small" type="text" onClick={() => setEditing((value) => !value)} />
          <Dropdown
            menu={{
              items: menu,
              onClick: ({ key }) => {
                if (key === 'copy') {copyWidget(id);}

                if (key === 'move') {moveWidgetToPageModal(id);}

                if (key === 'delete') {
                  modal.confirm({
                    title: t('deleteConfirm'),
                    content: t('deleteData'),
                    okType: 'danger',
                    onOk: () => {
                      delWidget(id);
                      message.success(t('deleteOk'));
                    },
                  });
                }
              },
            }}
            trigger={['click']}
          >
            <Button icon={<MenuOutlined />} size="small" type="text" />
          </Dropdown>
        </>
      }
      size="small"
      title={
        <div
          ref={dragHandleRef}
          className={classNames('mx-[-8px] my-[-4px] min-w-0 truncate rounded-[6px] px-[8px] py-[4px] select-none', {
            'cursor-grab active:cursor-grabbing': dragHandleRef,
            'shadow-[0_2px_8px_rgba(0,0,0,0.28)] ring-1 ring-[#1677ff]/40': isTitleDragging,
          })}
          onMouseDown={onTitleMouseDown}
        >
          {editing ? (
            <Input
              value={draftName}
              onBlur={saveName}
              onChange={(event) => setDraftName(event.target.value)}
              onPressEnter={saveName}
            />
          ) : (
            name
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {data.clocks.map((clock) => {
          const shown = formatClockTime(clock.timezone, locale, now);
          return (
            <div key={clock.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm opacity-65">{timeZoneLabel(clock.timezone, locale)}</div>
                <div className="truncate text-xs opacity-45">{shown.date}</div>
              </div>
              <div className="shrink-0 text-2xl font-medium tabular-nums tracking-tight">{shown.time}</div>
              {editing ? <Button icon={<DeleteOutlined />} size="small" type="text" onClick={() => removeZone(clock.id)} /> : null}
            </div>
          );
        })}
        {data.clocks.length === 0 ? <div className="text-sm opacity-45">{t('addTimeZone')}</div> : null}
        {editing ? (
          <div className="flex gap-2">
            <Select
              className="min-w-0 flex-1"
              options={options}
              placeholder={t('timeZonePlaceholder')}
              showSearch={{
                filterOption: (input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
              }}
              value={zone}
              onChange={setZone}
            />
            <Button icon={<PlusOutlined />} onClick={addZone}>
              {t('add')}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default ClockCard;
