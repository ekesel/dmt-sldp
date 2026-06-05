'use client';

import { useContext } from 'react';
import { NewsfeedContext, NewsfeedContextType, Author, Post } from '../context/NewsfeedContext';

export type { Author, Post };

export function useNewsfeedData(): NewsfeedContextType {
    const context = useContext(NewsfeedContext);
    if (!context) {
        throw new Error('useNewsfeedData must be used within a NewsfeedProvider');
    }
    return context;
}
