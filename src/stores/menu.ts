import { type Icon } from "@/components/Base/Lucide/Lucide.vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useI18n } from "@/composables/useI18n";
import { watch } from "vue";

export interface Menu {
    icon: Icon;
    title: string;
    badge?: number;
    pageName?: string;
    subMenu?: Menu[];
    ignore?: boolean;
    action?: () => void;
}

export interface MenuState {
    value: Array<Menu | string>;
}

export const useMenuStore = defineStore("menu", {
    state: (): MenuState => ({
        value: [],
    }),

    actions: {
        initializeMenu() {
            const { t, locale } = useI18n();

            // Generar menú inicial
            this.generateMenu(t);

            // Watcher para regenerar menú cuando cambie el idioma
            watch(locale, () => {
                this.generateMenu(t);
            });
        },

        generateMenu(t: any) {
            this.value = [
                t('menu.dashboard'),
                {
                    icon: "SquareUser",
                    pageName: "teachers",
                    title: t('menu.teachers'),
                },
                {
                    icon: "BookOpen",
                    pageName: "courses",
                    title: t('menu.courses'),
                },
                {
                    icon: "GraduationCap",
                    pageName: "students",
                    title: t('menu.students'),
                },
                {
                    icon: "Calendar",
                    pageName: "student-availabilities",
                    title: t('menu.availabilities'),
                },
                {
                    icon: "Clock",
                    pageName: "schedules",
                    title: t('menu.schedules'),
                },
                {
                    icon: "PercentSquare",
                    pageName: "accounts",
                    title: t('menu.accounts'),
                },
                {
                    icon: "Building",
                    pageName: "shops",
                    title: t('menu.shops'),
                },
                {
                    icon: "SigmaSquare",
                    pageName: "transactions",
                    title: t('menu.transfers'),
                },
                t('menu.session'),
                {
                    icon: "SquareUser",
                    pageName: "my-data",
                    title: t('menu.myData'),
                },
                {
                    icon: "FlipVertical",
                    pageName: "change-password",
                    title: t('menu.changePassword'),
                },
                {
                    icon: "FlipHorizontal",
                    title: t('menu.logout'),
                    action: () => useAuthStore().logout()
                }
            ];
        }

    }
});
