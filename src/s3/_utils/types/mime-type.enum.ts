export enum MimeTypeEnum {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const IMAGE_MIME_TYPES = [
  MimeTypeEnum.JPEG,
  MimeTypeEnum.PNG,
  MimeTypeEnum.WEBP,
];

export const DOCUMENT_MIME_TYPES = [MimeTypeEnum.PDF, MimeTypeEnum.DOCX];
