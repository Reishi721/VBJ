/**
 * useRealtimeSubscription — Stable Supabase Realtime channels
 * 
 * Replaces the Math.random() channel naming pattern that causes
 * memory/connection leaks during React StrictMode double-mount.
 * Uses a stable ref-based ID per component instance.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

let globalCounter = 0;

interface RealtimeConfig {
  /** Table names to subscribe to */
  tables: string[];
  /** Query keys to invalidate when changes occur */
  queryKeys: readonly unknown[][];
}

/**
 * Subscribe to Supabase realtime changes on one or more tables.
 * Automatically invalidates the specified query keys when changes occur.
 * Uses a stable channel name per component mount to prevent leaks.
 */
export function useRealtimeSubscription(config: RealtimeConfig) {
  const qc = useQueryClient();
  // Stable ID per component instance (survives re-renders, unique across mounts)
  const channelId = useRef(`rt_${++globalCounter}`);

  useEffect(() => {
    const chName = channelId.current;
    let ch = supabase.channel(chName);

    for (const table of config.tables) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const qk of config.queryKeys) {
            qc.invalidateQueries({ queryKey: qk });
          }
        }
      );
    }

    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // Only re-subscribe if the table/key config changes (which should be rare/never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.tables.join(","), qc]);
}
