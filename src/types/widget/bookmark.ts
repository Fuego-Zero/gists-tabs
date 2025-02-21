export type Bookmark = {
  icon: null | string;
  id: string;
  title: string;
  url: string;
};

export type Bookmarks = {
  bookmarks: Bookmark[];
  expanded: boolean;
};
