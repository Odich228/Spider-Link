/** Persistence adapter. Apply drizzle/0001_spider_rooms.sql before serving. */
export class D1Store {
  constructor(db) {
    if (!db?.prepare || !db?.batch) throw new Error('D1 database binding is required');
    this.db = db;
  }

  async getRoom(id) {
    const row = await this.db.prepare('SELECT body FROM spider_rooms WHERE id = ?').bind(id).first();
    return row ? JSON.parse(row.body) : null;
  }

  async findRoomByInviteCode(code) {
    const row = await this.db.prepare('SELECT body FROM spider_rooms WHERE invite_code = ?').bind(code).first();
    return row ? JSON.parse(row.body) : null;
  }

  async getMembership(tokenHash) {
    return await this.db.prepare(`SELECT token_hash AS tokenHash, room_id AS roomId,
      member_id AS memberId, created_at AS createdAt FROM spider_memberships WHERE token_hash = ?`)
      .bind(tokenHash).first() ?? null;
  }

  async createRoom(room, membership) {
    this.#validateMembership(membership, room.id);
    await this.db.batch([
      this.db.prepare(`INSERT INTO spider_rooms
        (id, invite_code, version, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(room.id, room.inviteCode, room.version, JSON.stringify(room), room.createdAt, room.updatedAt),
      this.db.prepare(`INSERT INTO spider_memberships
        (token_hash, room_id, member_id, created_at) VALUES (?, ?, ?, ?)`)
        .bind(membership.tokenHash, membership.roomId, membership.memberId, membership.createdAt ?? room.createdAt),
    ]);
    return true;
  }

  async commitRoom(room, expectedVersion, { membership, photos = [] } = {}) {
    if (room.version !== expectedVersion + 1) throw new Error('Invalid next room version');
    if (membership) this.#validateMembership(membership, room.id);
    for (const photo of photos) {
      if (photo.roomId !== room.id) throw new Error('Invalid photo room');
    }
    const statements = [this.db.prepare(`UPDATE spider_rooms SET invite_code = ?, version = ?,
      body = ?, updated_at = ? WHERE id = ? AND version = ?`)
      .bind(room.inviteCode, room.version, JSON.stringify(room), room.updatedAt, room.id, expectedVersion)];
    // D1 batches run sequentially in one transaction. changes() is the result of
    // the preceding statement: a failed CAS makes every dependent insert a no-op.
    // An insert/constraint failure rolls back both room JSON and credentials.
    if (membership) statements.push(this.db.prepare(`INSERT INTO spider_memberships
      (token_hash, room_id, member_id, created_at)
      SELECT ?, ?, ?, ? WHERE changes() = 1`)
      .bind(membership.tokenHash, membership.roomId, membership.memberId, membership.createdAt ?? room.updatedAt));
    for (const photo of photos) statements.push(this.#photoInsert(photo, true));
    const result = await this.db.batch(statements);
    return Number(result[0]?.meta?.changes ?? 0) === 1;
  }

  async createPhoto(photo) {
    const result = await this.#photoInsert(photo, false).run();
    return Number(result.meta?.changes ?? 0) === 1;
  }

  async getPhoto(id) {
    return await this.db.prepare(`SELECT id, room_id AS roomId, object_key AS key,
      content_type AS contentType, size, created_by AS createdBy, created_at AS createdAt
      FROM spider_room_photos WHERE id = ?`).bind(id).first() ?? null;
  }

  #photoInsert(photo, conditional) {
    return this.db.prepare(`INSERT INTO spider_room_photos
      (id, room_id, object_key, content_type, size, created_by, created_at)
      ${conditional ? 'SELECT ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1' : 'VALUES (?, ?, ?, ?, ?, ?, ?)'}`)
      .bind(photo.id, photo.roomId, photo.key, photo.contentType, photo.size, photo.createdBy, photo.createdAt);
  }

  #validateMembership(membership, roomId) {
    if (!membership || membership.roomId !== roomId || !membership.tokenHash || !membership.memberId)
      throw new Error('Invalid membership');
  }
}

export const createD1Store = db => new D1Store(db);
