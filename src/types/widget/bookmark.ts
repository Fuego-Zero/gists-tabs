export interface Bookmark {
  icon: null | string;
  id: string;
  title: string;
  url: string;
}

export interface Bookmarks {
  bookmarks: Bookmark[];
  expanded: boolean;
}
