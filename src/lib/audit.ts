import { getDb } from "./db";
import crypto from "crypto";

export function logAuditAction({
  userId,
  userName,
  action,
  targetType,
  targetId,
  targetName,
  details = null,
  ipAddress = "127.0.0.1",
}: {
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  details?: string | null;
  ipAddress?: string | null;
}) {
  try {
    const db = getDb();
    const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, target_type, target_id, target_name, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userName, action, targetType, targetId, targetName, details, ipAddress, timestamp);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
