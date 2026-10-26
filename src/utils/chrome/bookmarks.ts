interface PlainBookmarkNode {
  children?: PlainBookmarkNode[];
  id: string;
  title: string;
  url?: string;
}

function toPlain(nodes: chrome.bookmarks.BookmarkTreeNode[]): PlainBookmarkNode[] {
  return nodes.map((node) => ({
    children: node.children ? toPlain(node.children) : undefined,
    id: node.id,
    title: node.title,
    url: node.url,
  }));
}

/** 书签权限是可选的，只在用户点击导入时申请。 */
export async function ensureBookmarksPermission(): Promise<boolean> {
  const granted = await chrome.permissions.contains({ permissions: ['bookmarks'] });
  if (granted) {return true;}

  return chrome.permissions.request({ permissions: ['bookmarks'] });
}

export async function readBookmarkTree(): Promise<PlainBookmarkNode[]> {
  return toPlain(await chrome.bookmarks.getTree());
}
