/**
 * Business Service
 * Handles multi-tenancy business logic for the frontend
 */

import { apolloClient } from '../apollo/clients';
import { gql } from '@apollo/client/core';

// Types
export interface Business {
    id: string;
    name: string;
    slug: string;
}

export interface BusinessMembership {
    business: Business;
    role: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    default_business_id: string | null;
}

export interface BusinessContext {
    user: User;
    businesses: BusinessMembership[];
    selectedBusinessId: string | null;
}

// GraphQL Queries
const MY_BUSINESSES_QUERY = gql`
    query MyBusinesses {
        myBusinesses {
            business {
                id
                name
                slug
            }
            role
        }
    }
`;

const ME_QUERY = gql`
    query Me {
        me {
            id
            name
            email
            default_business_id
        }
    }
`;

const SET_DEFAULT_BUSINESS_MUTATION = gql`
    mutation SetDefaultBusiness($businessId: ID!) {
        setDefaultBusiness(business_id: $businessId) {
            id
            name
            email
            default_business_id
        }
    }
`;

/**
 * Fetch all businesses for the authenticated user
 */
export async function fetchMyBusinesses(): Promise<BusinessMembership[]> {
    try {
        const result = await apolloClient.query({
            query: MY_BUSINESSES_QUERY,
            fetchPolicy: 'network-only'
        });

        return result.data.myBusinesses;
    } catch (error) {
        console.error('Error fetching businesses:', error);
        throw error;
    }
}

/**
 * Fetch the current user with default business
 */
export async function fetchCurrentUser(): Promise<User> {
    try {
        const result = await apolloClient.query({
            query: ME_QUERY,
            fetchPolicy: 'network-only'
        });

        return result.data.me;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

/**
 * Set the default business for the user
 */
export async function setDefaultBusiness(businessId: string | number): Promise<User> {
    try {
        const result = await apolloClient.mutate({
            mutation: SET_DEFAULT_BUSINESS_MUTATION,
            variables: {
                businessId: businessId.toString()
            }
        });

        return result.data.setDefaultBusiness;
    } catch (error) {
        console.error('Error setting default business:', error);
        throw error;
    }
}

/**
 * Get the current business ID from localStorage
 */
export function getCurrentBusinessId(): string | null {
    const currentBusinessId = localStorage.getItem('currentBusinessId');

    // Fallback: get from user's default_business_id
    if (!currentBusinessId) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.default_business_id ? user.default_business_id.toString() : null;
            } catch (e) {
                console.error('Error parsing user from localStorage:', e);
            }
        }
    }

    return currentBusinessId;
}

/**
 * Set the current business ID in localStorage
 * This also updates the user object in localStorage
 */
export function setCurrentBusinessId(businessId: string | null): void {
    if (businessId) {
        localStorage.setItem('currentBusinessId', businessId);

        // Update user object with new default_business_id
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                user.default_business_id = businessId;
                localStorage.setItem('user', JSON.stringify(user));
            } catch (e) {
                console.error('Error updating user in localStorage:', e);
            }
        }
    } else {
        localStorage.removeItem('currentBusinessId');
    }
}

/**
 * Initialize business context after login
 */
export async function initializeBusinessContext(): Promise<BusinessContext> {
    try {
        // Fetch user and their businesses
        const [user, businesses] = await Promise.all([
            fetchCurrentUser(),
            fetchMyBusinesses()
        ]);

        // Check if there's a stored business in localStorage
        let selectedBusinessId = getCurrentBusinessId();

        // If no stored business, use default_business_id
        if (!selectedBusinessId && user.default_business_id) {
            selectedBusinessId = user.default_business_id;
        }

        // If still no business and user has businesses, use the first one
        if (!selectedBusinessId && businesses.length > 0) {
            selectedBusinessId = businesses[0].business.id;
        }

        // Set the current business
        if (selectedBusinessId) {
            setCurrentBusinessId(selectedBusinessId);
        }

        return {
            user,
            businesses,
            selectedBusinessId
        };
    } catch (error) {
        console.error('Error initializing business context:', error);
        throw error;
    }
}

/**
 * Switch to a different business
 */
export async function switchBusiness(businessId: string | number): Promise<boolean> {
    try {
        // Validate that the user has access to this business
        const businesses = await fetchMyBusinesses();
        const hasAccess = businesses.some(
            (membership) => membership.business.id === businessId.toString()
        );

        if (!hasAccess) {
            throw new Error('You do not have access to this business');
        }

        // Set the current business
        setCurrentBusinessId(businessId.toString());

        // Update the default business on the server
        await setDefaultBusiness(businessId);

        // Clear Apollo cache to force refetch with new business context
        await apolloClient.clearStore();

        return true;
    } catch (error) {
        console.error('Error switching business:', error);
        throw error;
    }
}

/**
 * Clear business context (on logout)
 */
export function clearBusinessContext(): void {
    setCurrentBusinessId(null);
}