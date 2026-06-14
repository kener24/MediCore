export function isPdfFile(value?: string | null) {
  const file = value?.toLowerCase() ?? '';
  return file.includes('pdf') || file.endsWith('.pdf');
}

export function isImageFile(value?: string | null) {
  const file = value?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].some((type) => file.includes(type) || file.endsWith(`.${type}`));
}

export function getFileIcon(value?: string | null) {
  if (isPdfFile(value)) return 'file-pdf-box';
  if (isImageFile(value)) return 'file-image-outline';
  return 'file-document-outline';
}
