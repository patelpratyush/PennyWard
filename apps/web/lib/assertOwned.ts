import { db } from '@/lib/db'

/**
 * Categories may be system-defaults (`userId: null`, shared with everyone) or
 * a user's own custom category. Either is a valid reference for that user.
 */
export async function assertCategoryOwned(categoryId: string, userId: string): Promise<boolean> {
  const cat = await db.category.findFirst({ where: { id: categoryId, OR: [{ userId: null }, { userId }] } })
  return !!cat
}

/** Accounts are always private — only the owning user may reference one. */
export async function assertAccountOwned(accountId: string, userId: string): Promise<boolean> {
  const acc = await db.financialAccount.findFirst({ where: { id: accountId, userId } })
  return !!acc
}
