'use client';

import React from 'react';
import { ResourceAllocationMatrix } from './components/ResourceAllocationMatrix';

export default function ResourceAllocationPage() {
  return (
    <div className="space-y-6 p-6">
      <ResourceAllocationMatrix />
    </div>
  );
}
