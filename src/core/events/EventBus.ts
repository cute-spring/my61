import { Logger } from '../logging/Logger';

export interface EventContext {
  timestamp: Date;
  source: string;
  sessionId?: string;
  userId?: string;
  [key: string]: any;
}

export interface EventHandler<T = any> {
  (event: T, context: EventContext): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  priority: number;
  filter?: (event: any, context: EventContext) => boolean;
  async: boolean;
}

export interface EventMetadata {
  type: string;
  subscribers: number;
  lastFired?: Date;
  totalFired: number;
}

export class EventBus {
  private static instance: EventBus;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private logger: Logger;
  private eventHistory: Array<{ type: string; context: EventContext; timestamp: Date }> = [];
  private maxHistorySize: number = 1000;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options: {
      priority?: number;
      filter?: (event: T, context: EventContext) => boolean;
      async?: boolean;
    } = {}
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      priority: options.priority || 5,
      filter: options.filter,
      async: options.async || false
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const eventSubscriptions = this.subscriptions.get(eventType)!;
    eventSubscriptions.push(subscription);
    
    // Sort by priority (higher priority first)
    eventSubscriptions.sort((a, b) => b.priority - a.priority);

    this.logger.debug(`Event subscription created`, {
      component: 'EventBus',
      eventType,
      subscriptionId,
      priority: subscription.priority,
      async: subscription.async
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of Array.from(this.subscriptions.entries())) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        
        this.logger.debug(`Event subscription removed`, {
          component: 'EventBus',
          eventType,
          subscriptionId
        });
        
        return true;
      }
    }
    
    this.logger.warn(`Subscription not found: ${subscriptionId}`, { component: 'EventBus' });
    return false;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T = any>(
    eventType: string,
    event: T,
    context: Partial<EventContext> = {}
  ): Promise<void> {
    const fullContext: EventContext = {
      timestamp: new Date(),
      source: context.source || 'unknown',
      sessionId: context.sessionId,
      userId: context.userId,
      ...context
    };

    const subscriptions = this.subscriptions.get(eventType) || [];
    
    if (subscriptions.length === 0) {
      this.logger.debug(`No subscribers for event: ${eventType}`, { component: 'EventBus' });
      return;
    }

    // Add to history
    this.addToHistory(eventType, fullContext);

    this.logger.debug(`Publishing event: ${eventType}`, {
      component: 'EventBus',
      eventType,
      subscribers: subscriptions.length,
      context: fullContext
    });

    // Execute handlers
    const promises: Promise<void>[] = [];
    
    for (const subscription of subscriptions) {
      try {
        // Apply filter if exists
        if (subscription.filter && !subscription.filter(event, fullContext)) {
          continue;
        }

        if (subscription.async) {
          // Async handler
          promises.push(
            Promise.resolve(subscription.handler(event, fullContext)).catch(error => {
              this.logger.error(`Async event handler failed`, {
                component: 'EventBus',
                eventType,
                subscriptionId: subscription.id
              }, error as Error);
            })
          );
        } else {
          // Sync handler
          try {
            await subscription.handler(event, fullContext);
          } catch (error) {
            this.logger.error(`Sync event handler failed`, {
              component: 'EventBus',
              eventType,
              subscriptionId: subscription.id
            }, error as Error);
          }
        }
      } catch (error) {
        this.logger.error(`Event handler execution failed`, {
          component: 'EventBus',
          eventType,
          subscriptionId: subscription.id
        }, error as Error);
      }
    }

    // Wait for all async handlers to complete
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  /**
   * Publish event synchronously (fire and forget)
   */
  publishSync<T = any>(
    eventType: string,
    event: T,
    context: Partial<EventContext> = {}
  ): void {
    this.publish(eventType, event, context).catch(error => {
      this.logger.error(`Sync publish failed`, {
        component: 'EventBus',
        eventType
      }, error as Error);
    });
  }

  /**
   * Get all event types that have subscribers
   */
  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscribers for a specific event type
   */
  getSubscribers(eventType: string): EventSubscription[] {
    return this.subscriptions.get(eventType) || [];
  }

  /**
   * Get event metadata
   */
  getEventMetadata(): EventMetadata[] {
    const metadata: EventMetadata[] = [];
    
    this.subscriptions.forEach((subscriptions, eventType) => {
      const lastEvent = this.eventHistory
        .filter(h => h.type === eventType)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      metadata.push({
        type: eventType,
        subscribers: subscriptions.length,
        lastFired: lastEvent?.timestamp,
        totalFired: this.eventHistory.filter(h => h.type === eventType).length
      });
    });
    
    return metadata;
  }

  /**
   * Clear all subscriptions for an event type
   */
  clearEvent(eventType: string): void {
    this.subscriptions.delete(eventType);
    this.logger.debug(`Cleared all subscriptions for event: ${eventType}`, { component: 'EventBus' });
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.logger.debug(`Cleared all event subscriptions and history`, { component: 'EventBus' });
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number): Array<{ type: string; context: EventContext; timestamp: Date }> {
    const history = [...this.eventHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimHistory();
  }

  private addToHistory(eventType: string, context: EventContext): void {
    this.eventHistory.push({
      type: eventType,
      context,
      timestamp: new Date()
    });

    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Subscribe to multiple event types at once
   */
  subscribeMultiple(
    subscriptions: Array<{
      eventType: string;
      handler: EventHandler;
      priority?: number;
      filter?: (event: any, context: EventContext) => boolean;
      async?: boolean;
    }>
  ): string[] {
    return subscriptions.map(sub => 
      this.subscribe(sub.eventType, sub.handler, {
        priority: sub.priority,
        filter: sub.filter,
        async: sub.async
      })
    );
  }

  /**
   * Unsubscribe from multiple subscriptions
   */
  unsubscribeMultiple(subscriptionIds: string[]): number {
    return subscriptionIds.filter(id => this.unsubscribe(id)).length;
  }

  /**
   * Check if an event type has subscribers
   */
  hasSubscribers(eventType: string): boolean {
    const subscriptions = this.subscriptions.get(eventType);
    return subscriptions ? subscriptions.length > 0 : false;
  }

  /**
   * Get total number of subscriptions
   */
  getTotalSubscriptions(): number {
    let total = 0;
    this.subscriptions.forEach(subscriptions => {
      total += subscriptions.length;
    });
    return total;
  }
} 