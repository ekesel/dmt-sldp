"use client";

import React from 'react';
import { ArrowRight, Gift, Sparkles, Star } from 'lucide-react';

export interface BirthdayPerson {
  id: string;
  name: string;
  role: string;
  avatar: string;
  date?: string;
  daysUntil?: number;
}

export interface AvatarProps {
  src: string;
  alt: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt }) => (
  <img
    src={src}
    alt={alt}
    className="h-10 w-10 rounded-full object-cover"
  />
);

const TODAY_BIRTHDAYS: BirthdayPerson[] = [
  { id: '1', name: 'Sara Kim', role: 'UI/UX Designer', avatar: 'https://i.pravatar.cc/150?u=sara' },
  { id: '2', name: 'Marcus Chen', role: 'Product Strategist', avatar: 'https://i.pravatar.cc/150?u=marcus' }
];

const UPCOMING_BIRTHDAYS: BirthdayPerson[] = [
  { id: '3', name: 'Diego Lopez', role: 'Marketing Lead', date: 'Apr 8', daysUntil: 2, avatar: 'https://i.pravatar.cc/150?u=diego' },
  { id: '4', name: 'Priya Nair', role: 'Engineering Manager', date: 'Apr 12', daysUntil: 6, avatar: 'https://i.pravatar.cc/150?u=priya' },
  { id: '5', name: 'Noah Williams', role: 'Customer Success', date: 'Apr 19', daysUntil: 13, avatar: 'https://i.pravatar.cc/150?u=noah' }
];

import TodayBirthdays from './TodayBirthdays';
import UpcomingBirthdaysList from './UpcomingBirthdaysList';

export default function UpcomingBirthdaysUI() {
  return (
    <div className="max-w-2xl mx-auto bg-card shadow-2xl rounded-[2rem] overflow-hidden border border-border">
      <TodayBirthdays birthdays={TODAY_BIRTHDAYS} />
      <UpcomingBirthdaysList birthdays={UPCOMING_BIRTHDAYS} />
    </div>
  );
}
