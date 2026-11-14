<script setup lang="ts">
import Lucide, { type Icon } from "@/components/Base/Lucide";
import { FormInput } from "@/components/Base/Form";
import {
  Dialog as HeadlessDialog,
  DialogPanel as HeadlessDialogPanel,
  TransitionRoot,
  TransitionChild,
} from "@headlessui/vue";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, type RouteLocationRaw } from "vue-router";
import { useI18n } from "@/composables/useI18n";
import {
  searchService,
  SEARCH_MIN_LENGTH,
  type SearchResults,
} from "@/services/searchService";

interface MainProps {
  quickSearch: boolean;
  setQuickSearch: (val: boolean) => void;
}

const props = withDefaults(defineProps<MainProps>(), {
  quickSearch: false,
  setQuickSearch: () => {},
});

const { t } = useI18n();
const router = useRouter();

const DEBOUNCE_MS = 300;

/** A secondary link of a row (e.g. the student's courses in the calendar) */
interface ResultAction {
  label: string;
  icon: Icon;
  to: RouteLocationRaw;
}

/** One selectable row, already resolved to where it leads */
interface ResultItem {
  key: string;
  title: string;
  subtitle: string;
  to: RouteLocationRaw;
  actions: ResultAction[];
}

interface ResultGroup {
  type: "students" | "teachers" | "courses";
  icon: Icon;
  items: ResultItem[];
}

const search = ref("");
const results = ref<SearchResults | null>(null);
const loading = ref(false);
const error = ref(false);
const activeIndex = ref(0);
// Within the active row: 0 is the row itself, 1..n its actions (←/→ move between them)
const activeAction = ref(0);

const term = computed(() => search.value.trim());
const tooShort = computed(() => term.value.length < SEARCH_MIN_LENGTH);

const levelLabel = (level: string | null, track: string | null) =>
  [track, level].filter(Boolean).join(" · ");

const groups = computed<ResultGroup[]>(() => {
  if (!results.value) return [];
  const { students, teachers, courses } = results.value;

  return [
    {
      type: "students" as const,
      icon: "GraduationCap" as Icon,
      items: students.map((s) => ({
        key: `student-${s.id}`,
        title: s.name,
        subtitle: [s.email, levelLabel(s.level, s.track)].filter(Boolean).join(" — "),
        to: { name: "students", query: { search: s.name } },
        actions: [
          {
            label: t("quickSearch.actions.calendar"),
            icon: "CalendarDays" as Icon,
            to: { name: "student-enrollments", query: { student: String(s.id) } },
          },
        ],
      })),
    },
    {
      type: "teachers" as const,
      icon: "UserRound" as Icon,
      items: teachers.map((tc) => ({
        key: `teacher-${tc.id}`,
        title: tc.name,
        subtitle: tc.email ?? "",
        to: { name: "teachers", query: { name: tc.name } },
        actions: [],
      })),
    },
    {
      type: "courses" as const,
      icon: "BookOpen" as Icon,
      items: courses.map((c) => ({
        key: `course-${c.id}`,
        title: c.name,
        subtitle: levelLabel(c.level, c.track),
        to: { name: "courses", query: { id: String(c.id) } },
        actions: [
          {
            label: t("quickSearch.actions.calendar"),
            icon: "CalendarDays" as Icon,
            to: { name: "student-enrollments", query: { courses: String(c.id) } },
          },
          {
            label: t("quickSearch.actions.schedules"),
            icon: "Clock" as Icon,
            to: { name: "schedules", query: { course: String(c.id) } },
          },
        ],
      })),
    },
  ].filter((group) => group.items.length > 0);
});

// Flat list for keyboard navigation (↑/↓ move across groups)
const flatItems = computed(() => groups.value.flatMap((g) => g.items));
const indexOf = (item: ResultItem) => flatItems.value.indexOf(item);

// ── Search (debounced; a newer search aborts the previous request) ───────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let controller: AbortController | null = null;

const runSearch = async (q: string) => {
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = false;
  try {
    results.value = await searchService.search(q, controller.signal);
    activeIndex.value = 0;
    activeAction.value = 0;
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_CANCELED") return;
    results.value = null;
    error.value = true;
  }
  loading.value = false;
};

watch(term, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (q.length < SEARCH_MIN_LENGTH) {
    controller?.abort();
    results.value = null;
    loading.value = false;
    error.value = false;
    return;
  }
  loading.value = true;
  debounceTimer = setTimeout(() => runSearch(q), DEBOUNCE_MS);
});

// Start clean every time it opens
watch(
  () => props.quickSearch,
  (open) => {
    if (open) {
      search.value = "";
      results.value = null;
      activeIndex.value = 0;
      activeAction.value = 0;
    }
  }
);

const close = () => props.setQuickSearch(false);

const go = (to: RouteLocationRaw) => {
  close();
  void router.push(to);
};

const select = (item: ResultItem) => go(item.to);

const onInputKeydown = (evt: KeyboardEvent) => {
  const total = flatItems.value.length;
  if (evt.key === "ArrowDown" && total) {
    evt.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % total;
  } else if (evt.key === "ArrowUp" && total) {
    evt.preventDefault();
    activeIndex.value = (activeIndex.value - 1 + total) % total;
  } else if ((evt.key === "ArrowRight" || evt.key === "ArrowLeft") && total) {
    const actions = flatItems.value[activeIndex.value].actions.length;
    if (!actions) return;
    evt.preventDefault();
    const step = evt.key === "ArrowRight" ? 1 : -1;
    activeAction.value = (activeAction.value + step + actions + 1) % (actions + 1);
  } else if (evt.key === "Enter" && total) {
    evt.preventDefault();
    const item = flatItems.value[activeIndex.value];
    const action = item.actions[activeAction.value - 1];
    go(action ? action.to : item.to);
  }
};

// Keep the highlighted row visible while moving with the keyboard
watch(activeIndex, (i) => {
  activeAction.value = 0;
  document
    .querySelector(`[data-quick-search-index="${i}"]`)
    ?.scrollIntoView({ block: "nearest" });
});

// ── Global shortcuts: Ctrl/⌘+K opens, Esc closes ────────────────────────────
const onGlobalKeydown = (evt: KeyboardEvent) => {
  if (evt.key === "Escape" || evt.key === "Esc") {
    close();
  } else if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === "k") {
    evt.preventDefault();
    props.setQuickSearch(true);
  }
};

onMounted(() => document.addEventListener("keydown", onGlobalKeydown));
onUnmounted(() => {
  document.removeEventListener("keydown", onGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
  controller?.abort();
});
</script>

<template>
  <TransitionRoot appear :show="props.quickSearch" as="template">
    <HeadlessDialog
      as="div"
      class="relative z-[60]"
      @close="props.setQuickSearch"
    >
      <TransitionChild
        as="div"
        enter="ease-out duration-100"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          class="fixed inset-0 bg-gradient-to-b from-theme-1/50 via-theme-2/50 to-black/50 backdrop-blur-sm"
        />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex justify-center my-2 sm:mt-40">
          <TransitionChild
            as="div"
            class="w-full"
            enter="ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <HeadlessDialogPanel
              class="sm:w-[600px] lg:w-[700px] w-[95%] relative mx-auto transition-transform"
            >
              <div class="relative">
                <div
                  class="absolute inset-y-0 left-0 flex items-center justify-center w-12"
                >
                  <Lucide
                    icon="Search"
                    class="w-5 h-5 -mr-1.5 text-slate-500 stroke-[1]"
                  />
                </div>
                <FormInput
                  class="pl-12 pr-14 py-3.5 text-base rounded-lg focus:ring-0 border-0 shadow-lg"
                  type="text"
                  :placeholder="t('quickSearch.placeholder')"
                  autocomplete="off"
                  v-model="search"
                  @keydown="onInputKeydown"
                />
                <div class="absolute inset-y-0 right-0 flex items-center w-14">
                  <button
                    type="button"
                    class="px-2 py-1 mr-auto text-xs border rounded-[0.4rem] bg-slate-100 text-slate-500/80"
                    @click="close"
                  >
                    ESC
                  </button>
                </div>
              </div>
              <div
                class="relative z-10 pb-1 mt-1 bg-white rounded-lg shadow-lg max-h-[468px] sm:max-h-[615px] overflow-y-auto dark:bg-darkmode-600"
              >
                <!-- Initial state: help -->
                <div v-if="tooShort" class="px-5 py-4">
                  <div class="text-xs uppercase text-slate-500">
                    {{ t("quickSearch.helpTitle") }}
                  </div>
                  <div class="flex flex-wrap gap-2 mt-3.5 text-slate-600">
                    <div
                      class="flex items-center gap-x-1.5 border rounded-full px-3 py-0.5 border-slate-300/70"
                    >
                      <Lucide icon="GraduationCap" class="w-4 h-4 stroke-[1.3]" />
                      {{ t("quickSearch.groups.students") }}
                    </div>
                    <div
                      class="flex items-center gap-x-1.5 border rounded-full px-3 py-0.5 border-slate-300/70"
                    >
                      <Lucide icon="UserRound" class="w-4 h-4 stroke-[1.3]" />
                      {{ t("quickSearch.groups.teachers") }}
                    </div>
                    <div
                      class="flex items-center gap-x-1.5 border rounded-full px-3 py-0.5 border-slate-300/70"
                    >
                      <Lucide icon="BookOpen" class="w-4 h-4 stroke-[1.3]" />
                      {{ t("quickSearch.groups.courses") }}
                    </div>
                  </div>
                  <div class="mt-3.5 text-slate-500">
                    {{ t("quickSearch.helpText", { min: SEARCH_MIN_LENGTH }) }}
                    <span class="hidden sm:inline">{{ t("quickSearch.keyboardHint") }}</span>
                  </div>
                </div>

                <!-- Loading -->
                <div
                  v-else-if="loading && !results"
                  class="flex items-center justify-center py-14"
                >
                  <Lucide icon="Loader" class="w-6 h-6 animate-spin text-slate-400" />
                </div>

                <!-- Error -->
                <div
                  v-else-if="error"
                  class="flex flex-col items-center justify-center gap-3 py-14"
                >
                  <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
                  <div class="text-slate-500">{{ t("quickSearch.error") }}</div>
                </div>

                <!-- No results -->
                <div
                  v-else-if="!groups.length"
                  class="flex flex-col items-center justify-center px-5 pt-14 pb-16"
                >
                  <Lucide
                    icon="SearchX"
                    class="w-16 h-16 text-theme-1/20 fill-theme-1/5 stroke-[0.5]"
                  />
                  <div class="mt-5 text-lg font-medium">
                    {{ t("quickSearch.noResultsTitle") }}
                  </div>
                  <div class="mt-2 leading-relaxed text-center text-slate-500 sm:w-2/3">
                    {{ t("quickSearch.noResultsText", { term }) }}
                  </div>
                </div>

                <!-- Results grouped by type -->
                <div v-else :class="{ 'opacity-60': loading }">
                  <div
                    v-for="(group, groupIndex) in groups"
                    :key="group.type"
                    :class="['px-5 py-4', { 'border-t border-dashed': groupIndex > 0 }]"
                  >
                    <div class="text-xs uppercase text-slate-500">
                      {{ t(`quickSearch.groups.${group.type}`) }}
                    </div>
                    <div class="flex flex-col gap-1 mt-3">
                      <div
                        v-for="item in group.items"
                        :key="item.key"
                        :data-quick-search-index="indexOf(item)"
                        :class="[
                          'flex items-center gap-1 border rounded-md',
                          indexOf(item) === activeIndex
                            ? 'bg-slate-100 border-slate-200 dark:bg-darkmode-400 dark:border-darkmode-400'
                            : 'border-transparent hover:bg-slate-50/80 hover:border-slate-100',
                        ]"
                        @mouseenter="activeIndex = indexOf(item)"
                      >
                        <button
                          type="button"
                          :class="[
                            'flex items-center flex-1 min-w-0 gap-2.5 p-1.5 text-left rounded-md',
                            { 'ring-1 ring-theme-1/40': indexOf(item) === activeIndex && activeAction === 0 && item.actions.length },
                          ]"
                          @click="select(item)"
                        >
                          <div
                            class="flex items-center justify-center flex-none w-7 h-7 border rounded-md border-theme-1/10 bg-theme-1/10"
                          >
                            <Lucide
                              :icon="group.icon"
                              class="w-4 h-4 stroke-[1.3] text-theme-1"
                            />
                          </div>
                          <div class="min-w-0">
                            <div class="font-medium truncate">{{ item.title }}</div>
                            <div
                              v-if="item.subtitle"
                              class="text-xs truncate text-slate-500"
                            >
                              {{ item.subtitle }}
                            </div>
                          </div>
                        </button>
                        <button
                          v-for="(action, actionIndex) in item.actions"
                          :key="action.label"
                          type="button"
                          :title="action.label"
                          :aria-label="`${action.label}: ${item.title}`"
                          :class="[
                            'flex items-center flex-none gap-1.5 px-2 py-2 mr-1 text-xs rounded-md text-slate-500 hover:bg-theme-1/10 hover:text-theme-1',
                            { 'bg-theme-1/10 text-theme-1': indexOf(item) === activeIndex && activeAction === actionIndex + 1 },
                          ]"
                          @click="go(action.to)"
                        >
                          <Lucide :icon="action.icon" class="w-4 h-4 stroke-[1.5]" />
                          <span class="hidden sm:inline whitespace-nowrap">{{ action.label }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </HeadlessDialogPanel>
          </TransitionChild>
        </div>
      </div>
    </HeadlessDialog>
  </TransitionRoot>
</template>
