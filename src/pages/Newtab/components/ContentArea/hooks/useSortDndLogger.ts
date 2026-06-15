import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { infoSortDndLog, roundMs, warnSortDndLog } from '../utils/sortDndLog';

import type { Widget } from '@/types';

import type { SortModeStartResult, SortModeWidget, WidgetInsertPosition } from '../../../types';

type SortDndStats = {
  crossColumnHoverCount: number;
  dragStartedAt: number;
  hoverCount: number;
  maxFrameMs: number;
  maxSyncMs: number;
  slowHoverCount: number;
  totalSyncMs: number;
  widgetId: Widget['id'];
};

type DragEnterState = {
  afterStartHandlerAt: number;
  committed: boolean;
  requestedAt: number;
  startResult: SortModeStartResult;
  widgetId: Widget['id'];
};

type RecordHoverParams = {
  crossColumn: boolean;
  hoverStartedAt: number;
  insertPosition: WidgetInsertPosition;
  sourceId: Widget['id'];
  syncMs: number;
  targetId: Widget['id'];
};

type ScheduleDragEndClearParams = {
  clear: () => void;
  dropPreviewActive: boolean;
};

type Params = {
  columns: SortModeWidget[][];
  displayWidgetCount: number;
  draggingWidgetId: Widget['id'] | null;
  isSortMode: boolean;
};

const SORT_DND_SLOW_HOVER_MS = 24;
const SORT_DND_SLOW_END_MS = 24;

const useSortDndLogger = (params: Params) => {
  const { columns, displayWidgetCount, draggingWidgetId, isSortMode } = params;
  const endTimerRef = useRef<null | number>(null);
  const enterStateRef = useRef<DragEnterState | null>(null);
  const frameIdRef = useRef<null | number>(null);
  const statsRef = useRef<SortDndStats | null>(null);

  const beginDrag = useCallback(
    (widgetId: Widget['id'], startResult: SortModeStartResult, requestedAt = performance.now()) => {
      // 新一轮拖拽开始时清掉上一次 end 的延迟任务，避免连续拖拽时状态被晚到的 timer 清空。
      if (endTimerRef.current !== null) {
        window.clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }

      const afterStartHandlerAt = performance.now();

      statsRef.current = {
        crossColumnHoverCount: 0,
        dragStartedAt: requestedAt,
        hoverCount: 0,
        maxFrameMs: 0,
        maxSyncMs: 0,
        slowHoverCount: 0,
        totalSyncMs: 0,
        widgetId,
      };
      enterStateRef.current = {
        afterStartHandlerAt,
        committed: false,
        requestedAt,
        startResult,
        widgetId,
      };

      infoSortDndLog(
        'drag enter start',
        {
          alreadySortMode: startResult.alreadySortMode,
          createDraftMs: roundMs(startResult.createDraftMs),
          handlerMs: roundMs(afterStartHandlerAt - requestedAt),
          reason: startResult.reason,
          startSyncMs: roundMs(startResult.syncMs),
          widgetCount: startResult.widgetCount,
          widgetId,
        },
        { verbose: true },
      );
    },
    [],
  );

  const recordHover = useCallback(
    (hoverParams: RecordHoverParams) => {
      const { crossColumn, hoverStartedAt, insertPosition, sourceId, syncMs, targetId } = hoverParams;
      const stats = statsRef.current;

      if (stats) {
        if (crossColumn) {
          stats.crossColumnHoverCount += 1;
        }

        stats.hoverCount += 1;
        stats.totalSyncMs += syncMs;
        stats.maxSyncMs = Math.max(stats.maxSyncMs, syncMs);
      }

      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }

      // hover 同步耗时和下一帧耗时分开记录，方便定位是计算慢还是渲染慢。
      frameIdRef.current = requestAnimationFrame(() => {
        frameIdRef.current = null;

        const frameMs = performance.now() - hoverStartedAt;
        const currentStats = statsRef.current;

        if (currentStats) {
          currentStats.maxFrameMs = Math.max(currentStats.maxFrameMs, frameMs);
        }

        if (syncMs < SORT_DND_SLOW_HOVER_MS && frameMs < SORT_DND_SLOW_HOVER_MS) return;

        if (currentStats) {
          currentStats.slowHoverCount += 1;
        }

        warnSortDndLog(
          'slow hover',
          {
            frameMs: roundMs(frameMs),
            hoverCount: currentStats?.hoverCount ?? null,
            insertPosition,
            sourceId,
            syncMs: roundMs(syncMs),
            targetId,
            widgetCount: displayWidgetCount,
          },
          { verbose: true },
        );
      });
    },
    [displayWidgetCount],
  );

  const scheduleDragEndClear = useCallback((params: ScheduleDragEndClearParams) => {
    const { clear, dropPreviewActive } = params;

    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    const stats = statsRef.current;
    const endRequestedAt = performance.now();

    statsRef.current = null;
    enterStateRef.current = null;

    if (endTimerRef.current !== null) {
      window.clearTimeout(endTimerRef.current);
    }

    infoSortDndLog(
      'drag end requested',
      {
        dropPreviewActive,
        hoverCount: stats?.hoverCount ?? 0,
        maxFrameMs: roundMs(stats?.maxFrameMs ?? 0),
        maxSyncMs: roundMs(stats?.maxSyncMs ?? 0),
        widgetId: stats?.widgetId ?? '',
      },
      { verbose: true },
    );

    // 拖拽结束清理放到宏任务里，让 drop 的最后一次数据提交先完成，减少动画/保存互相抢帧。
    endTimerRef.current = window.setTimeout(() => {
      endTimerRef.current = null;

      const clearStartedAt = performance.now();

      clear();

      const stateClearSyncMs = performance.now() - clearStartedAt;

      requestAnimationFrame(() => {
        const clearFrameMs = performance.now() - clearStartedAt;

        if (clearFrameMs >= SORT_DND_SLOW_END_MS) {
          warnSortDndLog(
            'slow drag end',
            {
              clearFrameMs: roundMs(clearFrameMs),
              stateClearSyncMs: roundMs(stateClearSyncMs),
              widgetId: stats?.widgetId ?? '',
            },
            { verbose: true },
          );
        }

        if (!stats || stats.hoverCount === 0) return;

        const durationMs = performance.now() - stats.dragStartedAt;
        const avgSyncMs = stats.totalSyncMs / stats.hoverCount;

        window.setTimeout(() => {
          infoSortDndLog('drag summary', {
            avgSyncMs: roundMs(avgSyncMs),
            clearFrameMs: roundMs(clearFrameMs),
            crossColumnHoverCount: stats.crossColumnHoverCount,
            durationMs: roundMs(durationMs),
            endDelayMs: roundMs(clearStartedAt - endRequestedAt),
            hoverCount: stats.hoverCount,
            maxFrameMs: roundMs(stats.maxFrameMs),
            maxSyncMs: roundMs(stats.maxSyncMs),
            slowHoverCount: stats.slowHoverCount,
            stateClearSyncMs: roundMs(stateClearSyncMs),
            widgetId: stats.widgetId,
          });
        }, 0);
      });
    }, 0);
  }, []);

  useLayoutEffect(() => {
    const enterState = enterStateRef.current;

    if (!enterState || enterState.committed || !isSortMode || !draggingWidgetId) return;

    const committedAt = performance.now();

    enterState.committed = true;

    infoSortDndLog(
      'sort mode committed',
      {
        afterHandlerMs: roundMs(committedAt - enterState.afterStartHandlerAt),
        columnSizes: columns.map((column) => column.length),
        totalMs: roundMs(committedAt - enterState.requestedAt),
        widgetCount: displayWidgetCount,
        widgetId: enterState.widgetId,
      },
      { verbose: true },
    );
  }, [columns, displayWidgetCount, draggingWidgetId, isSortMode]);

  useEffect(
    () => () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }

      if (endTimerRef.current !== null) {
        window.clearTimeout(endTimerRef.current);
      }
    },
    [],
  );

  return {
    beginDrag,
    recordHover,
    scheduleDragEndClear,
  };
};

export default useSortDndLogger;
