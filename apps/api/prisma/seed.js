import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const categories = [
  { name: 'Everyday carry', slug: 'everyday-carry', sortOrder: 1 },
  { name: 'Home & living', slug: 'home-living', sortOrder: 2 },
  { name: 'Tech essentials', slug: 'tech-essentials', sortOrder: 3 },
  { name: 'Lifestyle', slug: 'lifestyle', sortOrder: 4 },
];
const demoProducts = [
  { title: 'The Everyday Tote', slug: 'everyday-tote', category: 'everyday-carry', priceCents: 295000, compareAtCents: 350000, stock: 28, featured: true, imageUrl: '/demo/tote.svg', description: 'A relaxed everyday carryall with room for the little things that matter. Demo product — replace before launching.' },
  { title: 'Solstice Desk Lamp', slug: 'solstice-desk-lamp', category: 'home-living', priceCents: 649000, compareAtCents: null, stock: 15, featured: true, imageUrl: '/demo/lamp.svg', description: 'Warm light, calm mornings and a thoughtful silhouette for your workspace. Demo product — replace before launching.' },
  { title: 'Studio Wireless Headphones', slug: 'studio-wireless-headphones', category: 'tech-essentials', priceCents: 1290000, compareAtCents: 1490000, stock: 12, featured: true, imageUrl: '/demo/headphones.svg', description: 'Comfortable on-ear audio for every playlist and every journey. Demo product — replace before launching.' },
  { title: 'Coastal Water Bottle', slug: 'coastal-water-bottle', category: 'lifestyle', priceCents: 210000, compareAtCents: null, stock: 40, featured: true, imageUrl: '/demo/bottle.svg', description: 'A reusable bottle with a clean silhouette and an easy everyday feel. Demo product — replace before launching.' },
  { title: 'Canvas Mini Crossbody', slug: 'canvas-mini-crossbody', category: 'everyday-carry', priceCents: 385000, compareAtCents: null, stock: 26, featured: false, imageUrl: '/demo/bag.svg', description: 'Compact essentials, hands free and ready for the day. Demo product — replace before launching.' },
  { title: 'Ceramic Morning Cup', slug: 'ceramic-morning-cup', category: 'home-living', priceCents: 165000, compareAtCents: 210000, stock: 32, featured: false, imageUrl: '/demo/mug.svg', description: 'A handcrafted-feel cup for slow mornings. Demo product — replace before launching.' },
  { title: 'Pocket Bluetooth Speaker', slug: 'pocket-bluetooth-speaker', category: 'tech-essentials', priceCents: 890000, compareAtCents: null, stock: 9, featured: false, imageUrl: '/demo/speaker.svg', description: 'Small speaker, big everyday energy. Demo product — replace before launching.' },
  { title: 'Weekend Travel Pouch', slug: 'weekend-travel-pouch', category: 'lifestyle', priceCents: 240000, compareAtCents: null, stock: 36, featured: false, imageUrl: '/demo/pouch.svg', description: 'Keep your essentials together wherever the weekend takes you. Demo product — replace before launching.' }
];
try {
  await db.storeSettings.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
  for (const c of categories) await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  for (const p of demoProducts) {
    const category = await db.category.findUnique({ where: { slug: p.category } });
    await db.product.upsert({ where: { slug: p.slug }, update: {}, create: { title: p.title, slug: p.slug, categoryId: category.id, priceCents: p.priceCents, compareAtCents: p.compareAtCents, stock: p.stock, featured: p.featured, imageUrl: p.imageUrl, description: p.description, status: 'ACTIVE' } });
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must have at least 12 characters');
    const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'ADMIN') throw new Error('ADMIN_EMAIL belongs to a customer; refusing to promote automatically.');
    if (!existing) {
      await db.user.create({ data: { email, name: 'Store Administrator', role: 'ADMIN', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) } });
      console.log(`Admin created: ${email}`);
    } else console.log('Admin exists. Password was not overwritten.');
  } else console.log('ADMIN_EMAIL or ADMIN_PASSWORD missing; no admin created.');
  console.log('Demo products and store settings ready. Replace sample items before going live.');
} finally { await db.$disconnect(); }
