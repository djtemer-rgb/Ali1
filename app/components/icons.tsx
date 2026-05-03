"use client";
import React from 'react'

export const TrophyIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="trophy">
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10l-1 4H8L7 4z" />
    <path d="M6 11h12" />
  </svg>
)

export const BookIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="book">
    <path d="M4 19l1-1a5 5 0 0 1 3-1h9" />
    <path d="M4 6v13" />
    <path d="M20 6v13" />
  </svg>
)

export const CalendarIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="calendar">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)

export const SettingsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="settings">
    <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1-1.51V12a1.65 1.65 0 0 0-1.51-1h-2a1.65 1.65 0 0 0-1 1.51V12a1.65 1.65 0 0 0-1.51 1h-2A1.65 1.65 0 0 0 2 14.5v1a1.65 1.65 0 0 0-1 1.82l.06.06A2 2 0 1 1 2 19.1l.06-.06a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 1-1.51V14A1.65 1.65 0 0 0 6.5 12h1A1.65 1.65 0 0 0 9 10.85V9.5" />
  </svg>
)
