import { watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Keep list filters in sync when the URL query changes from outside while the view stays
 * mounted (e.g. the quick search navigating to /students?search=... from /students).
 *
 * A filter only takes the new value if it still holds the previous one: when the change
 * comes from the view itself (router.replace while typing), the filter is already ahead of
 * the URL and is left alone.
 */
export function useQueryFilterSync(filters: Record<string, Ref<string>>) {
  const route = useRoute()
  const routeName = route.name

  watch(
    () => route.query,
    (query, oldQuery) => {
      if (route.name !== routeName) return

      for (const [key, filter] of Object.entries(filters)) {
        const next = (query[key] as string) || ''
        const prev = (oldQuery?.[key] as string) || ''
        if (next !== prev && filter.value === prev) filter.value = next
      }
    }
  )
}
