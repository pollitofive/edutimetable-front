<template>
  <template v-if="version">
    <button
      type="button"
      class="px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors dark:border-darkmode-400 dark:text-slate-400 dark:hover:bg-darkmode-400"
      :title="t('changelog.badgeTitle')"
      :aria-label="t('changelog.badgeTitle')"
      data-testid="layout-version-badge"
      @click="isOpen = true"
    >
      v{{ version }}
    </button>
    <ChangelogModal :is-visible="isOpen" :entries="entries" @close="isOpen = false" />
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ChangelogModal from "@/views/components/ChangelogModal.vue";
import { useChangelog } from "@/composables/useChangelog";
import { useI18n } from "@/composables/useI18n";

const { t } = useI18n();
const { entries, version, load } = useChangelog();
const isOpen = ref(false);

// Fire and forget: the badge shows up when the file arrives, without blocking the layout
onMounted(() => {
  load();
});
</script>
