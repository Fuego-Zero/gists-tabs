import { useCallback, useEffect, useState } from 'react';

import Storage from '@/classes/Storage';

export default function useActivePage(): [activePageId: string, setActivePageId: (id: string) => void] {
  const [activePageId, setActivePageId] = useState('');

  useEffect(() => {
    Storage.getActivePageId().then((data) => {
      setActivePageId(data);
    });
  }, []);

  const setActivePageIdHandler = useCallback((id: string) => {
    setActivePageId(id);
    Storage.setActivePageId(id);
  }, []);

  return [activePageId, setActivePageIdHandler];
}
