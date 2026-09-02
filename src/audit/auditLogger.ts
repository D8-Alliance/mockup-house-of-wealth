import { AuditEvent, AuditActionType, AuditResultType } from './auditTypes';
import { INITIAL_AUDIT_EVENTS } from './mockAuditEvents';

class AuditLoggerStore {
  private events: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];

  public logEvent(eventData: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent {
    const newEvent: AuditEvent = {
      ...eventData,
      eventId: `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString()
    };
    this.events.unshift(newEvent);
    return newEvent;
  }

  public getEvents(): AuditEvent[] {
    return [...this.events];
  }

  public filterEvents(params: {
    userId?: string;
    organisationId?: string;
    countryNodeId?: string;
    action?: AuditActionType;
    role?: string;
  }): AuditEvent[] {
    return this.events.filter(e => {
      if (params.userId && e.userId !== params.userId) return false;
      if (params.organisationId && e.organisationId !== params.organisationId) return false;
      if (params.countryNodeId && e.countryNodeId !== params.countryNodeId) return false;
      if (params.action && e.action !== params.action) return false;
      if (params.role && e.role !== params.role) return false;
      return true;
    });
  }
}

export const auditLogger = new AuditLoggerStore();
