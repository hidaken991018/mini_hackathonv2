import {
  MAX_RECEIPT_IMAGE_BYTES,
  analyzeReceiptRequestSchema,
  inventoryBulkRequestSchema,
  inventoryUpdateRequestSchema,
} from '@/lib/validation/schemas';

const toBase64Length = (bytes: number) => Math.ceil(bytes / 3) * 4;

describe('validation schemas', () => {
  it('rejects invalid quantityValue type in inventory update', () => {
    const result = inventoryUpdateRequestSchema.safeParse({
      quantityValue: 'not-a-number',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid item payload in inventory bulk', () => {
    const result = inventoryBulkRequestSchema.safeParse({
      items: [
        {
          name: '卵',
          quantityValue: '6',
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects oversized analyze-receipt base64 payload', () => {
    const oversizedPayload = 'A'.repeat(toBase64Length(MAX_RECEIPT_IMAGE_BYTES + 1));

    const result = analyzeReceiptRequestSchema.safeParse({
      imageData: `data:image/jpeg;base64,${oversizedPayload}`,
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid analyze-receipt payload', () => {
    const validPayload = 'A'.repeat(toBase64Length(1024));

    const result = analyzeReceiptRequestSchema.safeParse({
      imageData: `data:image/png;base64,${validPayload}`,
    });

    expect(result.success).toBe(true);
  });
});
