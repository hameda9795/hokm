import dotenv from 'dotenv';
import db from '../db/database.js';

// Load environment variables early
dotenv.config();

export interface AuthorizedGroup {
  chatId: number;
  groupName: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  addedBy: string;
  lastNotifiedAt: Date | null;
}

export type AuthorizationStatus = 'authorized' | 'expired' | 'not_authorized';

export interface AuthorizationResult {
  status: AuthorizationStatus;
  group?: AuthorizedGroup;
  daysRemaining?: number;
}

export class GroupAuthService {
  // بررسی آیا کاربر ادمین است - هر بار از env میخونه
  isAdmin(telegramId: number): boolean {
    const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID || '0');
    console.log(`[Auth] Checking admin: user=${telegramId}, admin=${adminId}, match=${telegramId === adminId}`);
    return telegramId === adminId;
  }

  getAdminUsername(): string {
    return process.env.ADMIN_TELEGRAM_USERNAME || 'max_hmd';
  }

  // اضافه کردن گروه جدید
  addGroup(chatId: number, groupName: string, daysValid: number, addedBy: string): AuthorizedGroup {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO authorized_groups (chat_id, group_name, expires_at, is_active, added_by, last_notified_at)
      VALUES (?, ?, ?, 1, ?, NULL)
    `);

    stmt.run(chatId, groupName, expiresAt.toISOString(), addedBy);

    return {
      chatId,
      groupName,
      expiresAt,
      isActive: true,
      createdAt: new Date(),
      addedBy,
      lastNotifiedAt: null
    };
  }

  // حذف گروه
  removeGroup(chatId: number): boolean {
    const stmt = db.prepare('DELETE FROM authorized_groups WHERE chat_id = ?');
    const result = stmt.run(chatId);
    return result.changes > 0;
  }

  // غیرفعال کردن گروه
  deactivateGroup(chatId: number): boolean {
    const stmt = db.prepare('UPDATE authorized_groups SET is_active = 0 WHERE chat_id = ?');
    const result = stmt.run(chatId);
    return result.changes > 0;
  }

  // فعال کردن گروه
  activateGroup(chatId: number): boolean {
    const stmt = db.prepare('UPDATE authorized_groups SET is_active = 1 WHERE chat_id = ?');
    const result = stmt.run(chatId);
    return result.changes > 0;
  }

  // تمدید اعتبار گروه
  extendGroup(chatId: number, days: number): AuthorizedGroup | null {
    const group = this.getGroupInfo(chatId);
    if (!group) return null;

    // اگر منقضی شده، از امروز شروع کن
    const baseDate = group.expiresAt > new Date() ? group.expiresAt : new Date();
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    const stmt = db.prepare(`
      UPDATE authorized_groups
      SET expires_at = ?, is_active = 1, last_notified_at = NULL
      WHERE chat_id = ?
    `);

    stmt.run(newExpiresAt.toISOString(), chatId);

    return {
      ...group,
      expiresAt: newExpiresAt,
      isActive: true,
      lastNotifiedAt: null
    };
  }

  // بررسی مجاز بودن گروه
  checkAuthorization(chatId: number): AuthorizationResult {
    const group = this.getGroupInfo(chatId);

    if (!group) {
      return { status: 'not_authorized' };
    }

    if (!group.isActive) {
      return { status: 'not_authorized', group };
    }

    const now = new Date();
    if (group.expiresAt < now) {
      return { status: 'expired', group };
    }

    const daysRemaining = Math.ceil((group.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status: 'authorized',
      group,
      daysRemaining
    };
  }

  // دریافت اطلاعات یک گروه
  getGroupInfo(chatId: number): AuthorizedGroup | null {
    const stmt = db.prepare('SELECT * FROM authorized_groups WHERE chat_id = ?');
    const row = stmt.get(chatId) as any;

    if (!row) return null;

    return {
      chatId: row.chat_id,
      groupName: row.group_name,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      addedBy: row.added_by,
      lastNotifiedAt: row.last_notified_at ? new Date(row.last_notified_at) : null
    };
  }

  // لیست همه گروه‌ها
  getAllGroups(): AuthorizedGroup[] {
    const stmt = db.prepare('SELECT * FROM authorized_groups ORDER BY expires_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      chatId: row.chat_id,
      groupName: row.group_name,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      addedBy: row.added_by,
      lastNotifiedAt: row.last_notified_at ? new Date(row.last_notified_at) : null
    }));
  }

  // لیست گروه‌های منقضی شده که اطلاع‌رسانی نشدند
  getExpiredGroupsToNotify(): AuthorizedGroup[] {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM authorized_groups
      WHERE expires_at < ? AND is_active = 1 AND last_notified_at IS NULL
    `);
    const rows = stmt.all(now) as any[];

    return rows.map(row => ({
      chatId: row.chat_id,
      groupName: row.group_name,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      addedBy: row.added_by,
      lastNotifiedAt: null
    }));
  }

  // ثبت اطلاع‌رسانی انقضا
  markAsNotified(chatId: number): void {
    const stmt = db.prepare(`
      UPDATE authorized_groups
      SET last_notified_at = ?
      WHERE chat_id = ?
    `);
    stmt.run(new Date().toISOString(), chatId);
  }

  // لیست گروه‌هایی که به زودی منقضی می‌شوند (برای هشدار)
  getGroupsExpiringSoon(days: number = 3): AuthorizedGroup[] {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + days);

    const stmt = db.prepare(`
      SELECT * FROM authorized_groups
      WHERE expires_at > ? AND expires_at < ? AND is_active = 1
      ORDER BY expires_at ASC
    `);
    const rows = stmt.all(now.toISOString(), soon.toISOString()) as any[];

    return rows.map(row => ({
      chatId: row.chat_id,
      groupName: row.group_name,
      expiresAt: new Date(row.expires_at),
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      addedBy: row.added_by,
      lastNotifiedAt: row.last_notified_at ? new Date(row.last_notified_at) : null
    }));
  }

  // آمار گروه‌ها
  getStats(): { total: number; active: number; expired: number } {
    const now = new Date().toISOString();

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM authorized_groups');
    const total = (totalStmt.get() as any).count;

    const activeStmt = db.prepare('SELECT COUNT(*) as count FROM authorized_groups WHERE expires_at > ? AND is_active = 1');
    const active = (activeStmt.get(now) as any).count;

    const expiredStmt = db.prepare('SELECT COUNT(*) as count FROM authorized_groups WHERE expires_at <= ? OR is_active = 0');
    const expired = (expiredStmt.get(now) as any).count;

    return { total, active, expired };
  }
}

// Singleton instance
export const groupAuthService = new GroupAuthService();
