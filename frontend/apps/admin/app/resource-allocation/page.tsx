'use client';

import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ResourceAllocationMatrix } from './components/ResourceAllocationMatrix';

export default function ResourceAllocationPage() {
  return (
    <DashboardLayout>
      <ResourceAllocationMatrix />
    </DashboardLayout>
  );
}
