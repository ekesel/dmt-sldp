'use client';

import { useEffect } from 'react';
import { setGlobalErrorHandler } from '@dmt/api';
import toast from 'react-hot-toast';

export default function APIConfig() {
    useEffect(() => {
        setGlobalErrorHandler((error) => {
            const status = error.response?.status;
            let message = error.response?.data?.detail || error.message || 'An unexpected error occurred';

            if (status === 403) {
                message = `Permission Denied: ${message}`;
            } else if (status >= 500) {
                message = `Server Error: ${message}`;
            }

            toast.error(message, {
                duration: 5000,
                position: 'top-right',
            });
        });
    }, []);

    return null;
}
