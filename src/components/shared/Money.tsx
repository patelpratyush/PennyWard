import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Animated currency value — counts toward the target number. */
export function AnimatedMoney({
  value, className, decimals = 2, compact = false, duration = 0.7,
}: {
  value: number
  className?: string
  decimals?: number
  compact?: boolean
  duration?: number
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      prev.current = value
      return
    }
    const from = prev.current
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      prev.current = value
    }
  }, [value, duration, reduced])

  return (
    <span className={cn('tnum', className)} data-fin>
      {formatCurrency(display, { decimals, compact })}
    </span>
  )
}

export function Money({ value, className, decimals = 2, sign = false, compact = false }: {
  value: number; className?: string; decimals?: number; sign?: boolean; compact?: boolean
}) {
  return (
    <span className={cn('tnum', className)} data-fin>
      {formatCurrency(value, { decimals, sign, compact })}
    </span>
  )
}
