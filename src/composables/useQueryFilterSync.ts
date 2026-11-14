import { watch, type Ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'

type QueryValue = LocationQueryValue | LocationQueryValue[] | undefined

/**
 * Keep list filters in sync when the URL query changes from outside while the view stays
 * mounted (e.g. the quick search navigating to /students?search=... from /students).
 *
 * A filter only takes the new value if it still holds the previous one: when the change
 * comes from the view itself (router.replace while typing), the filter is already ahead of
 * the URL and is left alone. Array filters read repeated query params (?courses=1&courses=2).
 * onChange runs once after the filters were updated from the URL.
 */
export function useQueryFilterSync(
  filters: Record<string, Ref<string> | Ref<string[]>>,
  onChange?: () => void
) {
  const route = useRoute()
  const routeName = route.name

  const read = (value: QueryValue, asArray: boolean): string | string[] => {
    if (asArray) return (Array.isArray(value) ? value : value ? [value] : []).filter((v): v is string => !!v)
    return ((Array.isArray(value) ? value[0] : value) as string) || ''
  }
  const same = (a: string | string[], b: string | string[]) => JSON.stringify(a) === JSON.stringify(b)

  watch(
    () => route.query,
    (query, oldQuery) => {
      if (route.name !== routeName) return

      let changed = false
      for (const [key, filter] of Object.entries(filters)) {
        const asArray = Array.isArray(filter.value)
        const next = read(query[key], asArray)
        const prev = read(oldQuery?.[key], asArray)
        if (!same(next, prev) && same(filter.value, prev)) {
          filter.value = next
          changed = true
        }
      }
      if (changed) onChange?.()
    }
  )
}
