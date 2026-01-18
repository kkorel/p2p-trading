/**
 * Time Window Utilities
 */

import { TimeWindow } from '../types/beckn';

/**
 * Check if two time windows overlap
 * Returns true if either window is undefined (no filtering)
 */
export function timeWindowsOverlap(a?: TimeWindow, b?: TimeWindow): boolean {
  // If either window is undefined, treat as "always matches"
  if (!a || !b) {
    return true;
  }
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) {
    return true;
  }
  
  const aStart = new Date(a.startTime).getTime();
  const aEnd = new Date(a.endTime).getTime();
  const bStart = new Date(b.startTime).getTime();
  const bEnd = new Date(b.endTime).getTime();
  
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Calculate the overlap duration in milliseconds
 */
export function calculateOverlapDuration(a?: TimeWindow, b?: TimeWindow): number {
  // If either window is undefined, return 0 (no overlap to calculate)
  if (!a || !b) return 0;
  if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) return 0;
  
  const aStart = new Date(a.startTime).getTime();
  const aEnd = new Date(a.endTime).getTime();
  const bStart = new Date(b.startTime).getTime();
  const bEnd = new Date(b.endTime).getTime();
  
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  
  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Calculate time window duration in milliseconds
 */
export function getTimeWindowDuration(tw?: TimeWindow): number {
  if (!tw || !tw.startTime || !tw.endTime) return 0;
  return new Date(tw.endTime).getTime() - new Date(tw.startTime).getTime();
}

/**
 * Calculate time window fit ratio (0.0 to 1.0)
 */
export function calculateTimeWindowFit(offer?: TimeWindow, requested?: TimeWindow): number {
  if (!offer || !requested) return 1; // Perfect fit if no time constraints
  
  const overlapDuration = calculateOverlapDuration(offer, requested);
  const requestedDuration = getTimeWindowDuration(requested);
  
  if (requestedDuration === 0) return 1; // No duration requested = perfect fit
  
  return Math.min(1, overlapDuration / requestedDuration);
}
