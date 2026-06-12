import React from 'react';

import BookmarkDragPreview from '../Bookmark/components/BookmarkDragPreview';
import WidgetDragPreview from '../WidgetDragPreview';

const DragPreviewLayer = () => (
  <>
    <WidgetDragPreview />
    <BookmarkDragPreview />
  </>
);

export default React.memo(DragPreviewLayer);
