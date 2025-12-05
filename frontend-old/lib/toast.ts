/**
 * Toast Utilities
 * Wrapper functions for react-hot-toast with consistent styling
 */

import toast from 'react-hot-toast';

/**
 * Show success toast
 */
export const showSuccess = (message: string) => {
    toast.success(message);
};

/**
 * Show error toast
 */
export const showError = (message: string) => {
    toast.error(message);
};

/**
 * Show loading toast
 * Returns toast ID that can be used to dismiss or update
 */
export const showLoading = (message: string) => {
    return toast.loading(message);
};

/**
 * Show info toast
 */
export const showInfo = (message: string) => {
    toast(message, {
        icon: 'ℹ️',
    });
};

/**
 * Show warning toast
 */
export const showWarning = (message: string) => {
    toast(message, {
        icon: '⚠️',
        style: {
            background: '#f59e0b',
            color: '#fff',
        },
    });
};

/**
 * Dismiss a specific toast
 */
export const dismissToast = (toastId: string) => {
    toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
    toast.dismiss();
};

/**
 * Show promise toast - automatically shows loading, success, or error
 */
export const showPromise = <T,>(
    promise: Promise<T>,
    messages: {
        loading: string;
        success: string;
        error: string;
    }
) => {
    return toast.promise(promise, messages);
};

/**
 * Custom toast with custom icon
 */
export const showCustom = (message: string, icon: string) => {
    toast(message, { icon });
};
