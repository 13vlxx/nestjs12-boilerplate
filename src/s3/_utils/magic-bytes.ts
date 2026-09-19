import { MimeTypeEnum } from './types/mime-type.enum.js';

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46];
const ZIP = [0x50, 0x4b, 0x03, 0x04];

export function detectMimeType(buffer: Buffer): MimeTypeEnum | null {
  if (startsWith(buffer, JPEG)) return MimeTypeEnum.JPEG;
  if (startsWith(buffer, PNG)) return MimeTypeEnum.PNG;
  if (startsWith(buffer, RIFF) && startsWith(buffer, WEBP, 8))
    return MimeTypeEnum.WEBP;
  if (startsWith(buffer, PDF)) return MimeTypeEnum.PDF;
  if (startsWith(buffer, ZIP) && buffer.includes('word/'))
    return MimeTypeEnum.DOCX;
  return null;
}
