'use client';

import { useEffect } from 'react';
import { setGlobalErrorHandler } from '@dmt/api';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function APIConfig() {
    useEffect(() => {
        setGlobalErrorHandler((error) => {
            let message = 'An unexpected error occurred';
            let status: number | undefined;

            if (axios.isAxiosError(error)) {
                status = error.response?.status;
                message = error.response?.data?.detail || error.message || message;
            } else if (error instanceof Error) {
                message = error.message;
            }

            if (status === 403) {
                message = `Permission Denied: ${message}`;
            } else if (status && status >= 500) {
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
