import store from '../data/store';
import { AuditLog } from '../../src/types';

export class AuditLogger {
  public log(actor: string, action: string, details: string, status: 'SUCCESS' | 'WARNING' | 'FAILURE' = 'SUCCESS', ip: string = '127.0.0.1'): AuditLog {
    return store.logAudit(actor, action, details, status, ip);
  }

  public getLogs(): AuditLog[] {
    return store.auditLogs;
  }

  public clearLogs() {
    store.auditLogs = [];
    this.log('SYSTEM', 'AUDIT_CLEAR', 'Security audit logs were cleared by the system admin overlay.', 'WARNING');
  }
}

export default new AuditLogger();
