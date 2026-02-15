'use client';

import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { UserList } from './components/UserList';

export default function UsersPage() {
    return (
        <DashboardLayout>
            <UserList />
        </DashboardLayout>
    );
}
