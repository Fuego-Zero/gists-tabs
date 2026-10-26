import type { Widget } from '@/types';

export interface ChromeBookmarkNode {
  children?: ChromeBookmarkNode[];
  id: string;
  title: string;
  url?: string;
}

export interface ImportFolder {
  id: string;
  links: { title: string; url: string }[];
  title: string;
}

export interface ImportTreeNode {
  children: ImportTreeNode[];
  /** 没有直接链接的文件夹只用来保持层级，不能勾选导入。 */
  folder: ImportFolder | null;
  key: string;
  title: string;
}

function isOpenable(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'file:' || protocol === 'ftp:';
  } catch {
    return false;
  }
}

function directLinks(node: ChromeBookmarkNode): ImportFolder['links'] {
  return (node.children ?? [])
    .filter((child): child is ChromeBookmarkNode & { url: string } => Boolean(child.url) && isOpenable(child.url ?? ''))
    .map((child) => ({ title: child.title.trim() || child.url, url: child.url }));
}

/** 收集有直接链接的文件夹，并保留没有链接但有子文件夹的层级。 */
export function bookmarkImportTree(nodes: ChromeBookmarkNode[]): ImportTreeNode[] {
  const walk = (node: ChromeBookmarkNode): ImportTreeNode | null => {
    if (!node.children) {return null;}

    const children = node.children.map(walk).filter((child): child is ImportTreeNode => Boolean(child));
    const links = directLinks(node);
    if (!links.length && !children.length) {return null;}

    return {
      children,
      folder: links.length
        ? { id: node.id, links, title: node.title.trim() || node.id }
        : null,
      key: node.id,
      title: node.title.trim() || node.id,
    };
  };

  return nodes.map(walk).filter((node): node is ImportTreeNode => Boolean(node));
}

export function foldersById(nodes: ImportTreeNode[]): Map<string, ImportFolder> {
  const map = new Map<string, ImportFolder>();
  const walk = (node: ImportTreeNode) => {
    if (node.folder) {map.set(node.folder.id, node.folder);}

    node.children.forEach(walk);
  };

  nodes.forEach(walk);
  return map;
}

/** 勾选的文件夹按顺序轮流放入三栏，排在该栏已有组件之后。 */
export function widgetsFromFolders(
  folders: ImportFolder[],
  existing: { col: number; row: number }[],
  createId: () => string,
): Extract<Widget, { type: 'bookmarks' }>[] {
  const nextRow = [0, 1, 2].map((col) => {
    const rows = existing.filter((widget) => widget.col === col).map((widget) => widget.row);
    return rows.length ? Math.max(...rows) + 1 : 0;
  });

  return folders.map((folder, index) => {
    const col = (index % 3) as 0 | 1 | 2;
    const row = nextRow[col];
    nextRow[col] += 1;
    return {
      col,
      data: {
        bookmarks: folder.links.map((link) => ({
          icon: null,
          id: createId(),
          title: link.title,
          url: link.url,
        })),
        expanded: true,
      },
      id: createId(),
      name: folder.title,
      row,
      type: 'bookmarks',
    };
  });
}
