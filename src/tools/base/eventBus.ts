/**
 * Advanced Event Bus System
 * Phase 3 - Advanced Features Foundation
 */

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface EventHandler<T = any> {
  (event: T): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  options: EventSubscriptionOptions;
  unsubscribe: () => void;
}

export interface EventSubscriptionOptions {
  async?: boolean;
  priority?: EventPriority;
  filter?: (event: any) => boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface EventHistoryEntry {
  id: string;
  timestamp: number;
  eventType: string;
  event: any;
  handlers: string[];
}

export class AdvancedEventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private history: EventHistoryEntry[] = [];
  private historyEnabled = false;
  private maxHistorySize = 1000;
  private disposed = false;

  /**
   * Subscribe to events with advanced options
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options: EventSubscriptionOptions = {}
  ): EventSubscription {
    if (this.disposed) {
      throw new Error('EventBus has been disposed');
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      options: {
        async: options.async || false,
        priority: options.priority || 'normal',
        filter: options.filter,
        timeout: options.timeout || 30000, // 30 seconds default
        retryCount: options.retryCount || 0,
        retryDelay: options.retryDelay || 1000
      },
      unsubscribe: () => this.unsubscribe(subscriptionId)
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push(subscription);
    
    // Sort by priority
    this.sortSubscriptionsByPriority(eventType);

    return subscription;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T = any>(eventType: string, event: T): Promise<void> {
    if (this.disposed) {
      throw new Error('EventBus has been disposed');
    }

    const subscriptions = this.subscriptions.get(eventType) || [];
    const handlers: string[] = [];

    // Record in history if enabled
    if (this.historyEnabled) {
      this.addToHistory(eventType, event, subscriptions.map(s => s.id));
    }

    // Group subscriptions by priority
    const priorityGroups = this.groupSubscriptionsByPriority(subscriptions);

    // Process each priority group
    for (const [priority, subs] of priorityGroups) {
      await this.processSubscriptions(subs, event, handlers);
    }
  }

  /**
   * Enable event history for debugging and replay
   */
  enableHistory(options: { maxEvents?: number } = {}): void {
    this.historyEnabled = true;
    this.maxHistorySize = options.maxEvents || 1000;
  }

  /**
   * Disable event history
   */
  disableHistory(): void {
    this.historyEnabled = false;
    this.history = [];
  }

  /**
   * Get event history
   */
  getHistory(options: {
    since?: Date;
    eventTypes?: string[];
    limit?: number;
  } = {}): EventHistoryEntry[] {
    let filtered = this.history;

    if (options.since) {
      filtered = filtered.filter(entry => entry.timestamp >= options.since!.getTime());
    }

    if (options.eventTypes) {
      filtered = filtered.filter(entry => options.eventTypes!.includes(entry.eventType));
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Replay events from history
   */
  async replayEvents(options: {
    since?: Date;
    eventTypes?: string[];
    limit?: number;
  } = {}): Promise<void> {
    const eventsToReplay = this.getHistory(options);
    
    for (const entry of eventsToReplay) {
      await this.publish(entry.eventType, entry.event);
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType);
        }
        break;
      }
    }
  }

  /**
   * Unsubscribe all handlers for an event type
   */
  unsubscribeAll(eventType: string): void {
    this.subscriptions.delete(eventType);
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    totalSubscriptions: number;
    eventTypes: number;
    historySize: number;
    historyEnabled: boolean;
    disposed: boolean;
  } {
    let totalSubscriptions = 0;
    for (const subscriptions of this.subscriptions.values()) {
      totalSubscriptions += subscriptions.length;
    }

    return {
      totalSubscriptions,
      eventTypes: this.subscriptions.size,
      historySize: this.history.length,
      historyEnabled: this.historyEnabled,
      disposed: this.disposed
    };
  }

  /**
   * Dispose the event bus
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.subscriptions.clear();
    this.history = [];
  }

  private sortSubscriptionsByPriority(eventType: string): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {return;}

    const priorityOrder: EventPriority[] = ['critical', 'high', 'normal', 'low'];
    
    subscriptions.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.options.priority || 'normal');
      const bIndex = priorityOrder.indexOf(b.options.priority || 'normal');
      return aIndex - bIndex;
    });
  }

  private groupSubscriptionsByPriority(subscriptions: EventSubscription[]): Map<EventPriority, EventSubscription[]> {
    const groups = new Map<EventPriority, EventSubscription[]>();
    
    for (const subscription of subscriptions) {
      const priority = subscription.options.priority || 'normal';
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(subscription);
    }

    return groups;
  }

  private async processSubscriptions<T>(
    subscriptions: EventSubscription[],
    event: T,
    handlers: string[]
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const subscription of subscriptions) {
      // Apply filter if provided
      if (subscription.options.filter && !subscription.options.filter(event)) {
        continue;
      }

      handlers.push(subscription.id);

      if (subscription.options.async) {
        // Async processing with timeout and retry
        const promise = this.processAsyncHandler(subscription, event);
        promises.push(promise);
      } else {
        // Synchronous processing
        try {
          const result = subscription.handler(event);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in synchronous event handler '${subscription.id}':`, error);
        }
      }
    }

    // Wait for all async handlers to complete
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  private async processAsyncHandler<T>(
    subscription: EventSubscription,
    event: T
  ): Promise<void> {
    let attempts = 0;
    const maxAttempts = subscription.options.retryCount! + 1;

    while (attempts < maxAttempts) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Handler timeout')), subscription.options.timeout);
        });

        const handlerPromise = subscription.handler(event);
        
        await Promise.race([handlerPromise, timeoutPromise]);
        return; // Success, exit retry loop
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.error(`Event handler '${subscription.id}' failed after ${maxAttempts} attempts:`, error);
          return;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, subscription.options.retryDelay));
      }
    }
  }

  private addToHistory(eventType: string, event: any, handlerIds: string[]): void {
    const entry: EventHistoryEntry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      eventType,
      event,
      handlers: handlerIds
    };

    this.history.push(entry);

    // Maintain history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

// Global event bus instance
export const eventBus = new AdvancedEventBus(); 