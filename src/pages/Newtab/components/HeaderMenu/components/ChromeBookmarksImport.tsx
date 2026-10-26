import { App, Modal, Select, Tree, type TreeProps, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';

import { t } from '@/i18n/translate';
import {
  bookmarkImportTree,
  foldersById,
  type ImportTreeNode,
  widgetsFromFolders,
} from '@/pages/Newtab/utils/chromeBookmarks';
import type { GistsTabs, Page } from '@/types';
import { readBookmarkTree } from '@/utils/chrome/bookmarks';
import { createId, createPage } from '@/utils/data/factory';

const { Text } = Typography;

interface Props {
  activePageId: string;
  gistsTabs: GistsTabs;
  onClose: () => void;
  open: boolean;
  pages: Page[];
  setActivePageId: (id: string) => void;
  setGistsTabs: (data: GistsTabs) => Promise<void> | void;
}

type Target = 'current' | 'new';

function treeData(nodes: ImportTreeNode[]): TreeProps['treeData'] {
  return nodes.map((node) => ({
    children: treeData(node.children),
    disableCheckbox: !node.folder,
    key: node.key,
    title: node.title,
  }));
}

const ChromeBookmarksImport = (props: Props) => {
  const { activePageId, gistsTabs, onClose, open, pages, setActivePageId, setGistsTabs } = props;
  const { message } = App.useApp();
  const [nodes, setNodes] = useState<ImportTreeNode[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [target, setTarget] = useState<Target>('current');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {return;}

    let cancelled = false;
    setLoading(true);
    setChecked([]);
    setTarget('current');
    readBookmarkTree()
      .then((tree) => {
        if (!cancelled) {setNodes(bookmarkImportTree(tree));}
      })
      .catch((error: unknown) => {
        console.error('读取 Chrome 书签失败', error);
        if (!cancelled) {message.error(t('importFail'));}
      })
      .finally(() => {
        if (!cancelled) {setLoading(false);}
      });

    return () => {
      cancelled = true;
    };
  }, [message, open]);

  const folders = useMemo(() => foldersById(nodes), [nodes]);
  const selected = checked.flatMap((id) => {
    const folder = folders.get(id);
    return folder ? [folder] : [];
  });

  async function importSelected() {
    const page = pages.find((item) => item.id === activePageId);
    const existing = target === 'current' && page ? page.widgets : [];
    const widgets = widgetsFromFolders(selected, existing, createId);
    if (!widgets.length) {return;}

    if (target === 'new' || !page) {
      const created = createPage(t('importChromeBookmarks'), widgets);
      gistsTabs.pages.push(created);
      await setGistsTabs({ ...gistsTabs });
      setActivePageId(created.id);
    } else {
      page.widgets.push(...widgets);
      await setGistsTabs({ ...gistsTabs });
    }

    message.success(t('importChromeOk'));
    onClose();
  }

  return (
    <Modal
      cancelText={t('cancel')}
      confirmLoading={loading}
      okButtonProps={{ disabled: !selected.length }}
      okText={t('importData')}
      open={open}
      title={t('importChromeTitle')}
      onCancel={onClose}
      onOk={() => {
        void importSelected();
      }}
    >
      <Text type="secondary">{t('importChromeHint')}</Text>
      <div className="mb-3 mt-3">
        <div className="mb-1">{t('importChromeTarget')}</div>
        <Select
          className="w-full"
          options={[
            { label: t('importChromeCurrentPage'), value: 'current' },
            { label: t('importChromeNewPage'), value: 'new' },
          ]}
          value={target}
          onChange={setTarget}
        />
      </div>
      {nodes.length ? (
        <Tree
          checkable
          defaultExpandAll
          className="max-h-80 overflow-auto"
          treeData={treeData(nodes)}
          onCheck={(keys) => {
            const list = Array.isArray(keys) ? keys : keys.checked;
            setChecked(list.map(String));
          }}
        />
      ) : (
        <Text>{loading ? t('running') : t('importChromeEmpty')}</Text>
      )}
    </Modal>
  );
};

export default ChromeBookmarksImport;
