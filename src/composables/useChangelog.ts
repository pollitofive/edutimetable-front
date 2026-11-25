import { computed, ref } from "vue";
import { fetchChangelog, currentVersion, type ChangelogEntry } from "@/services/changelogService";

// Module-level singleton: the changelog is fetched once per session and shared.
// It doesn't touch useLoading, so it never shows the global LoadingOverlay.
const entries = ref<ChangelogEntry[]>([]);
const loaded = ref(false);
let pending: Promise<void> | null = null;

export function useChangelog() {
  const load = (): Promise<void> => {
    if (!pending) {
      pending = fetchChangelog().then((data) => {
        entries.value = data;
        loaded.value = true;
      });
    }
    return pending;
  };

  const version = computed(() => currentVersion(entries.value));

  // Only for tests: forget the cached load
  const reset = () => {
    entries.value = [];
    loaded.value = false;
    pending = null;
  };

  return {
    entries,
    loaded,
    version,
    load,
    reset,
  };
}
