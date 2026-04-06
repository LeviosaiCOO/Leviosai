// ─── IN-MEMORY PRIORITY QUEUE ───────────────────────────────────────────────
// Min-heap keyed on (priority, createdAt). Swappable for Upstash Redis later.

import type { ReactorEvent } from "./types.js";

export interface IPriorityQueue {
  enqueue(event: ReactorEvent): void;
  dequeue(): ReactorEvent | null;
  peek(): ReactorEvent | null;
  size(): number;
  drain(): ReactorEvent[];
}

export class InMemoryPriorityQueue implements IPriorityQueue {
  private heap: ReactorEvent[] = [];

  enqueue(event: ReactorEvent): void {
    this.heap.push(event);
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): ReactorEvent | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  peek(): ReactorEvent | null {
    return this.heap[0] || null;
  }

  size(): number {
    return this.heap.length;
  }

  drain(): ReactorEvent[] {
    const events: ReactorEvent[] = [];
    while (this.heap.length > 0) {
      events.push(this.dequeue()!);
    }
    return events;
  }

  // ─── Heap internals ─────────────────────────────────────────────────

  private _compare(a: ReactorEvent, b: ReactorEvent): number {
    // Lower priority number = higher urgency
    if (a.metadata.priority !== b.metadata.priority) {
      return a.metadata.priority - b.metadata.priority;
    }
    // Same priority: FIFO by createdAt
    return a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this._compare(this.heap[idx], this.heap[parentIdx]) < 0) {
        [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private _sinkDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this._compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this._compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}
