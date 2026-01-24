<template>
    <div v-if="businessStore.hasMultipleBusinesses" class="business-selector">
        <select
            v-model="selectedBusinessId"
            @change="handleBusinessChange"
            class="block w-full px-3 py-2 text-sm border border-slate-300 dark:border-darkmode-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-darkmode-600 dark:text-slate-300"
        >
            <option
                v-for="membership in businessStore.businesses"
                :key="membership.business.id"
                :value="membership.business.id"
            >
                {{ membership.business.name }}
                <span v-if="membership.role !== 'staff'">
                    ({{ membership.role }})
                </span>
            </option>
        </select>
    </div>
    <div v-else-if="businessStore.hasBusiness" class="business-info">
        <p class="text-sm text-slate-700 dark:text-slate-300 font-medium">
            {{ businessStore.currentBusiness?.name }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useBusinessStore } from '@/stores/business';

const businessStore = useBusinessStore();
const selectedBusinessId = ref<string | null>(businessStore.selectedBusinessId);

// Watch for changes in the store's selected business
watch(() => businessStore.selectedBusinessId, (newValue) => {
    selectedBusinessId.value = newValue;
});

async function handleBusinessChange() {
    if (!selectedBusinessId.value) return;

    try {
        await businessStore.switchBusiness(selectedBusinessId.value);
    } catch (error) {
        console.error('Error switching business:', error);
        // Revert selection on error
        selectedBusinessId.value = businessStore.selectedBusinessId;
    }
}
</script>

<style scoped>
.business-selector {
    min-width: 200px;
}

.business-info {
    display: flex;
    align-items: center;
}
</style>