'use client';

import React from 'react';
import { ResourceAllocationMatrix } from './components/ResourceAllocationMatrix';

export default function ResourceAllocationPage() {
  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
      <ResourceAllocationMatrix />
    </div>
  );
}
