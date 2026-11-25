<template>
  <Dialog :open="isVisible" size="lg" @close="close">
    <Dialog.Panel data-testid="changelog-modal">
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">{{ t("changelog.title") }}</h2>
        <button
          type="button"
          class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-darkmode-400"
          :aria-label="t('changelog.close')"
          data-testid="changelog-close"
          @click="close"
        >
          <Lucide icon="X" class="w-5 h-5" />
        </button>
      </Dialog.Title>

      <div class="p-5">
        <p
          v-if="entries.length === 0"
          class="text-center text-slate-500"
          data-testid="changelog-empty"
        >
          {{ t("changelog.empty") }}
        </p>

        <section
          v-for="entry in entries"
          :key="entry.version"
          class="pb-5 mb-5 border-b border-dashed border-slate-200 last:border-0 last:mb-0 last:pb-0 dark:border-darkmode-400"
          data-testid="changelog-entry"
        >
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              class="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
              data-testid="changelog-entry-version"
            >
              v{{ entry.version }}
            </span>
            <span class="text-xs text-slate-500">{{ entry.fecha }}</span>
          </div>
          <h3 v-if="entry.titulo" class="mt-2 font-medium">{{ entry.titulo }}</h3>

          <div
            v-for="group in groupChangesByType(entry.cambios)"
            :key="group.tipo"
            class="mt-3"
            :data-testid="`changelog-group-${group.tipo}`"
          >
            <div class="text-xs font-medium uppercase text-slate-500">
              {{ t(`changelog.types.${group.tipo}`) }}
            </div>
            <ul class="mt-1 ml-5 list-disc">
              <li v-for="(cambio, index) in group.cambios" :key="index" class="mt-1">
                {{ cambio.texto }}
              </li>
            </ul>
          </div>
        </section>
      </div>
    </Dialog.Panel>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { useI18n } from "@/composables/useI18n";
import { groupChangesByType, type ChangelogEntry } from "@/services/changelogService";

interface Props {
  isVisible: boolean;
  entries: ChangelogEntry[];
}

interface Emits {
  (e: "close"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const close = () => {
  emit("close");
};
</script>
