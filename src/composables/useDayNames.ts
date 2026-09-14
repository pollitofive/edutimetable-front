import { useI18n } from '@/composables/useI18n'

export function useDayNames(namespace: string) {
  const { t } = useI18n()

  const getDayName = (day: number): string => {
    const days = [
      t(`${namespace}.days.sunday`),
      t(`${namespace}.days.monday`),
      t(`${namespace}.days.tuesday`),
      t(`${namespace}.days.wednesday`),
      t(`${namespace}.days.thursday`),
      t(`${namespace}.days.friday`),
      t(`${namespace}.days.saturday`),
    ]
    return days[day] || ''
  }

  return { getDayName }
}
