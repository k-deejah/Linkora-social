"use client";

import { useSyncExternalStore } from "react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type FollowState = {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Store internals                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

// Key format: `${followerAddress}:${followeeAddress}`
const followStateMap = new Map<string, FollowState>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Public API                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

const pendingMap = new Map<string, boolean>();
const legacyFollowingMap = new Map<string, boolean>();

export const OptimisticStore = {
  setFollowState(key: string, state: FollowState) {
    followStateMap.set(key, state);
    notify();
  },

  getFollowState(key: string): FollowState | undefined {
    return followStateMap.get(key);
  },

  clearFollowState(key: string) {
    followStateMap.delete(key);
    notify();
  },

  // Legacy API for FollowList.tsx
  subscribe,
  isFollowing(targetAddress: string): boolean {
    return legacyFollowingMap.get(targetAddress) ?? false;
  },
  setFollowing(targetAddress: string, isFollowing: boolean) {
    legacyFollowingMap.set(targetAddress, isFollowing);
    notify();
  },
  isPending(targetAddress: string): boolean {
    return pendingMap.get(targetAddress) ?? false;
  },
  setPending(targetAddress: string, isPending: boolean) {
    pendingMap.set(targetAddress, isPending);
    notify();
  },
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Hook                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the optimistic follow state if one exists, otherwise falls back
 * to `initialState` (the "truth" from the server/contract).
 *
 * @param follower  Current user's address (null when not connected)
 * @param followee  Target profile's address
 * @param initialState  Server-sourced truth state
 */
export function useOptimisticFollow(
  follower: string | null,
  followee: string,
  initialState: FollowState
): FollowState {
  const key = `${follower}:${followee}`;

  const optimistic = useSyncExternalStore(
    subscribe,
    // Client snapshot
    () => (follower ? OptimisticStore.getFollowState(key) : undefined),
    // Server snapshot — always undefined (no optimistic state on SSR)
    () => undefined
  );

  return optimistic ?? initialState;
}
