/**
 * Time Window Utilities
 */
import { TimeWindow } from '../types/beckn';
/**
 * Check if two time windows overlap
 */
export declare function timeWindowsOverlap(a: TimeWindow, b: TimeWindow): boolean;
/**
 * Calculate the overlap duration in milliseconds
 */
export declare function calculateOverlapDuration(a: TimeWindow, b: TimeWindow): number;
/**
 * Calculate time window duration in milliseconds
 */
export declare function getTimeWindowDuration(tw: TimeWindow): number;
/**
 * Calculate time window fit ratio (0.0 to 1.0)
 */
export declare function calculateTimeWindowFit(offer: TimeWindow, requested: TimeWindow): number;
