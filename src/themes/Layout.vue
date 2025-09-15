<script setup lang="ts">
import { useThemeStore, getTheme } from "@/stores/theme";
import { onMounted, computed } from "vue";

const Component = computed(() => getTheme(themeStore.theme).component);

const themeStore = useThemeStore();

onMounted(() => {
    useThemeStore().setTheme("hook");
});
</script>

<template>
    <div>
        <Component />
    </div>
</template>
