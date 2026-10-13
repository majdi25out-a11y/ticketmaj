export interface AvatarPreset {
  id: string;
  name: string;
  category: string;
  url: string;
}

// Clean neutral fallback avatar icon SVG
export const DEFAULT_USER_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <circle cx="50" cy="50" r="50" fill="#e2e8f0"/>
    <circle cx="50" cy="38" r="18" fill="#64748b"/>
    <path d="M 18 84 Q 50 58 82 84 Z" fill="#64748b"/>
  </svg>`
)}`;

export const DEFAULT_CARTOON_AVATAR = DEFAULT_USER_AVATAR;
export const DEFAULT_ADMIN_AVATAR = DEFAULT_USER_AVATAR;

// Empty arrays for preset avatars as user wants to upload/paste custom images only
export const CARTOON_AVATARS: AvatarPreset[] = [];
export const PROFESSIONAL_AVATARS: AvatarPreset[] = [];
export const SYMBOLIC_BADGES: { name: string; url: string }[] = [];

/**
 * Helper to compress uploaded image files to a clean 250x250 data URL.
 */
export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Le fichier dépasse la taille maximale autorisée de 10 Mo.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format d image invalide.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 250;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (img.width > img.height) {
          sourceWidth = img.height;
          sourceX = (img.width - img.height) / 2;
        } else if (img.height > img.width) {
          sourceHeight = img.width;
          sourceY = (img.height - img.width) / 2;
        }

        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
