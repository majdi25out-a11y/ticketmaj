import { Attachment } from '../types';

/**
 * Utility to process, compress, and format uploaded files for ticket attachments.
 * Mobile phone photos (which can be 5MB - 15MB+) are automatically resized & compressed
 * via Canvas to ~150KB - 300KB data URLs so they save reliably into the MySQL database
 * without triggering HTTP 413 Payload Too Large errors or memory limits on mobile browsers.
 */
export const processAttachmentFile = (file: File): Promise<Attachment> => {
  return new Promise((resolve) => {
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif|heic)$/i.test(file.name);
    const fileExt = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    let iconName = 'description';
    if (isImage) {
      iconName = 'image';
    } else if (file.type.includes('pdf') || fileExt === 'PDF') {
      iconName = 'picture_as_pdf';
    } else if (file.type.includes('zip') || file.type.includes('rar') || ['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(fileExt)) {
      iconName = 'folder_zip';
    } else if (['JS', 'TS', 'JSON', 'HTML', 'CSS', 'PY', 'JAVA', 'CPP', 'PHP', 'SQL'].includes(fileExt)) {
      iconName = 'code';
    } else if (['DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'CSV'].includes(fileExt)) {
      iconName = 'description';
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (isImage) {
      const reader = new FileReader();
      reader.onerror = () => {
        resolve({
          id: attachmentId,
          name: file.name,
          size: formatFileSize(file.size),
          type: fileExt,
          icon: iconName,
          url: '',
        });
      };

      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        const img = new Image();
        img.onerror = () => {
          // Fallback to raw data url if canvas image loading fails
          resolve({
            id: attachmentId,
            name: file.name,
            size: formatFileSize(file.size),
            type: fileExt,
            icon: iconName,
            url: rawDataUrl,
          });
        };

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_DIMENSION = 1400; // Optimal resolution for detail & low payload size
            let width = img.width;
            let height = img.height;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              if (width > height) {
                height = Math.round((height * MAX_DIMENSION) / width);
                width = MAX_DIMENSION;
              } else {
                width = Math.round((width * MAX_DIMENSION) / height);
                height = MAX_DIMENSION;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);

              // Compress to JPEG with 0.82 quality
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
              // Calculate compressed approximate size
              const head = 'data:image/jpeg;base64,';
              const approxBytes = Math.round(((compressedDataUrl.length - head.length) * 3) / 4);

              resolve({
                id: attachmentId,
                name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                size: formatFileSize(approxBytes > 0 ? approxBytes : file.size),
                type: 'JPG',
                icon: 'image',
                url: compressedDataUrl,
              });
              return;
            }
          } catch (_err) {
            // Ignore canvas error and fallback
          }

          resolve({
            id: attachmentId,
            name: file.name,
            size: formatFileSize(file.size),
            type: fileExt,
            icon: iconName,
            url: rawDataUrl,
          });
        };

        img.src = rawDataUrl;
      };

      reader.readAsDataURL(file);
    } else {
      // Non-image files (PDF, DOCX, TXT, etc.)
      const reader = new FileReader();
      reader.onerror = () => {
        resolve({
          id: attachmentId,
          name: file.name,
          size: formatFileSize(file.size),
          type: fileExt,
          icon: iconName,
          url: '',
        });
      };

      reader.onload = (e) => {
        resolve({
          id: attachmentId,
          name: file.name,
          size: formatFileSize(file.size),
          type: fileExt,
          icon: iconName,
          url: e.target?.result as string,
        });
      };

      reader.readAsDataURL(file);
    }
  });
};
