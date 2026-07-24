import {
  Banknote, Car, Coffee, CreditCard, Film, Fuel, HeartPulse, Home, Percent,
  PiggyBank, Plane, Repeat, Shield, ShoppingBag, ShoppingCart, Smartphone,
  Sparkles, Train, TrendingUp, Utensils, Wifi, Wrench, Zap, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  home: Home, wrench: Wrench, car: Car, fuel: Fuel, shield: Shield, train: Train,
  'shopping-cart': ShoppingCart, utensils: Utensils, coffee: Coffee, zap: Zap,
  wifi: Wifi, smartphone: Smartphone, 'shopping-bag': ShoppingBag, film: Film,
  repeat: Repeat, sparkles: Sparkles, plane: Plane, 'credit-card': CreditCard,
  'piggy-bank': PiggyBank, 'trending-up': TrendingUp, 'heart-pulse': HeartPulse,
  banknote: Banknote, percent: Percent,
}

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] ?? ShoppingBag
  return <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />
}

export const categoryIconNames = Object.keys(iconMap)
