import { defineStore } from 'pinia'
import {
    fetchMyBusinesses,
    fetchCurrentUser,
    switchBusiness as switchBusinessService,
    setCurrentBusinessId,
    getCurrentBusinessId,
    clearBusinessContext,
    type BusinessMembership,
    type User
} from '@/services/businessService'

interface BusinessState {
    businesses: BusinessMembership[]
    selectedBusinessId: string | null
    user: User | null
    isInitialized: boolean
}

export const useBusinessStore = defineStore('business', {
    state: (): BusinessState => ({
        businesses: [],
        selectedBusinessId: getCurrentBusinessId(),
        user: null,
        isInitialized: false
    }),

    getters: {
        currentBusiness: (state) => {
            if (!state.selectedBusinessId) return null
            const membership = state.businesses.find(
                m => m.business.id === state.selectedBusinessId
            )
            return membership?.business || null
        },

        currentRole: (state) => {
            if (!state.selectedBusinessId) return null
            const membership = state.businesses.find(
                m => m.business.id === state.selectedBusinessId
            )
            return membership?.role || null
        },

        hasMultipleBusinesses: (state) => state.businesses.length > 1,

        hasBusiness: (state) => state.businesses.length > 0
    },

    actions: {
        async initialize() {
            if (this.isInitialized) return

            try {
                // Fetch user and businesses in parallel
                const [user, businesses] = await Promise.all([
                    fetchCurrentUser(),
                    fetchMyBusinesses()
                ])

                this.user = user
                this.businesses = businesses

                // Determine which business to select
                let businessId = getCurrentBusinessId()

                // If no stored business, use default_business_id
                if (!businessId && user.default_business_id) {
                    businessId = user.default_business_id
                }

                // If still no business and user has businesses, use the first one
                if (!businessId && businesses.length > 0) {
                    businessId = businesses[0].business.id
                }

                // Set the selected business
                if (businessId) {
                    this.selectedBusinessId = businessId
                    setCurrentBusinessId(businessId)
                }

                this.isInitialized = true
            } catch (error) {
                console.error('Error initializing business context:', error)
                throw error
            }
        },

        async switchBusiness(businessId: string) {
            try {
                await switchBusinessService(businessId)
                this.selectedBusinessId = businessId

                // Reload the page to refresh all data with the new business context
                window.location.reload()
            } catch (error) {
                console.error('Error switching business:', error)
                throw error
            }
        },

        clear() {
            this.businesses = []
            this.selectedBusinessId = null
            this.user = null
            this.isInitialized = false
            clearBusinessContext()
        }
    }
})