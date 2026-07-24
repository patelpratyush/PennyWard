import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  { name: 'Rent or mortgage', group: 'Housing', icon: 'home', color: 'chart-1' },
  { name: 'Home maintenance', group: 'Housing', icon: 'wrench', color: 'chart-1' },
  { name: 'Car payment', group: 'Transportation', icon: 'car', color: 'chart-2' },
  { name: 'Fuel', group: 'Transportation', icon: 'fuel', color: 'chart-2' },
  { name: 'Insurance', group: 'Transportation', icon: 'shield', color: 'chart-2' },
  { name: 'Public transit', group: 'Transportation', icon: 'train', color: 'chart-2' },
  { name: 'Groceries', group: 'Food', icon: 'shopping-cart', color: 'chart-3' },
  { name: 'Dining', group: 'Food', icon: 'utensils', color: 'chart-3' },
  { name: 'Coffee', group: 'Food', icon: 'coffee', color: 'chart-3' },
  { name: 'Electricity', group: 'Utilities', icon: 'zap', color: 'chart-4' },
  { name: 'Internet', group: 'Utilities', icon: 'wifi', color: 'chart-4' },
  { name: 'Mobile phone', group: 'Utilities', icon: 'smartphone', color: 'chart-4' },
  { name: 'Shopping', group: 'Lifestyle', icon: 'shopping-bag', color: 'chart-6' },
  { name: 'Entertainment', group: 'Lifestyle', icon: 'film', color: 'chart-6' },
  { name: 'Subscriptions', group: 'Lifestyle', icon: 'repeat', color: 'chart-6' },
  { name: 'Personal care', group: 'Lifestyle', icon: 'sparkles', color: 'chart-6' },
  { name: 'Travel', group: 'Lifestyle', icon: 'plane', color: 'chart-6' },
  { name: 'Debt payments', group: 'Financial', icon: 'credit-card', color: 'chart-5' },
  { name: 'Savings', group: 'Financial', icon: 'piggy-bank', color: 'chart-7' },
  { name: 'Investments', group: 'Financial', icon: 'trending-up', color: 'chart-7' },
  { name: 'Health & pharmacy', group: 'Lifestyle', icon: 'heart-pulse', color: 'chart-8' },
  { name: 'Paycheck', group: 'Income', icon: 'banknote', color: 'chart-3', kind: 'income' as const },
  { name: 'Interest income', group: 'Income', icon: 'percent', color: 'chart-3', kind: 'income' as const },
]

async function main() {
  for (const c of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: `sys_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` },
      update: {},
      create: {
        id: `sys_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        userId: null,
        name: c.name,
        group: c.group,
        icon: c.icon,
        color: c.color,
        kind: c.kind ?? 'expense',
      },
    })
  }
}

main().finally(() => prisma.$disconnect())
