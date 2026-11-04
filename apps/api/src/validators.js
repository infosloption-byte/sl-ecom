import { z } from 'zod';

const required = (n) => z.string().trim().min(1).max(n);
export const email = z.string().trim().toLowerCase().email().max(191);
export const password = z.string().min(10).max(128);
export const addressSchema = z.object({
  fullName: required(120), phone: z.string().trim().regex(/^[+\d][\d\s-]{8,17}$/, 'Enter a valid phone number'),
  line1: required(191), line2: z.string().trim().max(191).optional().default(''),
  city: required(100), district: z.enum(['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya']),
  postal: z.string().trim().max(20).optional().default(''), isDefault: z.boolean().optional().default(false)
}).strict();
const productImage = z.string().trim().max(500).refine(v => v.startsWith('/uploads/') || v.startsWith('/demo/') || /^https:\/\//.test(v), 'Use HTTPS or a locally uploaded image');
export const productSchema = z.object({
  title: required(191), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(191).optional(),
  description: z.string().trim().max(5000).default(''), imageUrl: z.string().max(500).refine(v => !v || v.startsWith('/uploads/') || v.startsWith('/demo/') || /^https:\/\//.test(v), 'Use an HTTPS or uploaded image').optional().default(''),
  images: z.array(productImage).max(8).default([]),
  specifications: z.array(z.object({ label: required(80), value: required(200) }).strict()).max(12).default([]),
  shortDescription: z.string().trim().max(320).nullable().optional(),
  sku: z.string().trim().max(80).nullable().optional(),
  priceCents: z.number().int().min(100).max(100000000), compareAtCents: z.number().int().min(100).max(100000000).nullable().optional(),
  stock: z.number().int().min(0).max(1000000), featured: z.boolean().default(false),
  status: z.enum(['ACTIVE','DRAFT']).default('DRAFT'), categoryId: required(50)
}).strict();
export const settingsSchema = z.object({
  storeName: required(120), announcement: z.string().trim().max(200), contactEmail: email,
  shippingFlatCents: z.number().int().min(0).max(1000000), freeShippingFromCents: z.number().int().min(0).max(100000000)
}).strict();
export const idString = z.string().min(5).max(100);
