export function uploadFile(accept = 'application/json'): Promise<File | null> {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement('input');
      let settled = false;

      const controller = new AbortController();
      const { signal } = controller;

      const cleanup = () => {
        controller.abort();
        if (input.parentNode) document.body.removeChild(input);
      };

      const finish = (file: File | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(file);
      };

      const handleChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0] ?? null;
        finish(file);
      };

      const handleCancel = () => {
        finish(null);
      };

      const handleBlur = () => {
        setTimeout(() => {
          if (!settled && !input.files?.length) finish(null);
        });
      };

      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', handleChange, { once: true, signal });
      input.addEventListener('cancel', handleCancel, { once: true, signal });
      input.addEventListener('blur', handleBlur, { once: true, signal });

      input.click();
    } catch (error) {
      reject(error);
    }
  });
}

export function downloadFile<T extends Record<string, any>>(
  data: T,
  fileName = 'download.json',
  type = 'application/json',
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}
