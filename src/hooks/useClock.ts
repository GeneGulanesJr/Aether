import { useState, useEffect } from 'react'

/**
 * Returns a formatted HH:MM time string, updating every 60 seconds.
 * Minimal re-renders — only ticks on the minute boundary.
 */
export function useClock(): string {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return fmt(now)
  })

  useEffect(() => {
    // Schedule next tick at the top of the next minute
    const schedule = () => {
      const now = new Date()
      const msUntilNextMinute =
        (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
      return msUntilNextMinute
    }

    let timeoutId: ReturnType<typeof setTimeout>

    const tick = () => {
      setTime(fmt(new Date()))
      timeoutId = setTimeout(tick, schedule())
    }

    timeoutId = setTimeout(tick, schedule())
    return () => clearTimeout(timeoutId)
  }, [])

  return time
}

function fmt(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
