import { z } from 'zod';

export const MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024;

const base64DataUrlPrefixRegex = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const base64PayloadRegex = /^[A-Za-z0-9+/]+={0,2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const normalizeBase64Payload = (value: string): string =>
  value.replace(base64DataUrlPrefixRegex, '').replace(/\s/g, '');

const isValidBase64Payload = (value: string): boolean => {
  const payload = normalizeBase64Payload(value);
  if (!payload || payload.length % 4 !== 0) return false;
  return base64PayloadRegex.test(payload);
};

const getBase64SizeInBytes = (value: string): number => {
  const payload = normalizeBase64Payload(value);
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
};

const isValidDateString = (value: string): boolean => {
  if (!dateRegex.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const optionalDateStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .refine(
    (value) =>
      value === undefined || value === null || isValidDateString(value),
    { message: '日付はYYYY-MM-DD形式で指定してください' },
  );

const optionalTrimmedStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

export const analyzeReceiptRequestSchema = z
  .object({
    imageData: z
      .string()
      .min(1, 'imageDataは必須です')
      .refine(
        (value) =>
          base64DataUrlPrefixRegex.test(value) || isValidBase64Payload(value),
        { message: 'imageDataは有効なbase64画像データで指定してください' },
      )
      .refine((value) => isValidBase64Payload(value), {
        message: 'imageDataのbase64形式が不正です',
      })
      .refine(
        (value) => getBase64SizeInBytes(value) <= MAX_RECEIPT_IMAGE_BYTES,
        {
          message: `imageDataは${MAX_RECEIPT_IMAGE_BYTES / (1024 * 1024)}MB以下で指定してください`,
        },
      ),
  })
  .strict();

const inventoryItemInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'nameは必須です')
      .max(200, 'nameは200文字以下で指定してください'),
    quantityValue: z
      .number({ message: 'quantityValueは数値で指定してください' })
      .positive('quantityValueは0より大きい値で指定してください')
      .optional(),
    quantityUnit: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value === null || value.length <= 20,
      { message: 'quantityUnitは20文字以下で指定してください' },
    ),
    expireDate: optionalDateStringSchema,
    consumeBy: optionalDateStringSchema,
    purchaseDate: optionalDateStringSchema,
    category: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value === null || value.length <= 50,
      { message: 'categoryは50文字以下で指定してください' },
    ),
    note: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value === null || value.length <= 500,
      { message: 'noteは500文字以下で指定してください' },
    ),
    isStaple: z
      .boolean({ message: 'isStapleはbooleanで指定してください' })
      .optional(),
  })
  .strict();

export const inventoryBulkRequestSchema = z
  .object({
    items: z.array(inventoryItemInputSchema).min(1, 'itemsは1件以上必要です'),
  })
  .strict();

export const inventoryUpdateRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'nameは空文字を許可しません')
      .max(200, 'nameは200文字以下で指定してください')
      .optional(),
    quantityValue: z
      .number({ message: 'quantityValueは数値で指定してください' })
      .min(1, 'quantityValueは1以上で指定してください')
      .optional(),
    quantityUnit: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value === null || value.length <= 20,
      { message: 'quantityUnitは20文字以下で指定してください' },
    ),
    expireDate: optionalDateStringSchema,
    consumeBy: optionalDateStringSchema,
    purchaseDate: optionalDateStringSchema,
    note: optionalTrimmedStringSchema.refine(
      (value) => value === undefined || value === null || value.length <= 500,
      { message: 'noteは500文字以下で指定してください' },
    ),
    isStaple: z
      .boolean({ message: 'isStapleはbooleanで指定してください' })
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: '少なくとも1つの更新項目を指定してください',
  });
