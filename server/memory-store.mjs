const copy = value => value == null ? value : structuredClone(value);

/** In-memory implementation for local development and isolated HTTP tests. */
export class MemoryStore {
  #rooms = new Map();
  #memberships = new Map();
  #photos = new Map();

  async getRoom(id) {
    return copy(this.#rooms.get(id) ?? null);
  }

  async findRoomByInviteCode(code) {
    for (const room of this.#rooms.values()) {
      if (room.inviteCode === code) return copy(room);
    }
    return null;
  }

  async getMembership(tokenHash) {
    return copy(this.#memberships.get(tokenHash) ?? null);
  }

  async createRoom(room, membership) {
    if (this.#rooms.has(room.id)) throw new Error('Room already exists');
    this.#assertInviteAvailable(room.inviteCode);
    this.#assertMembershipAvailable(membership, room.id);
    // Prepare all values before publishing either map entry.
    const nextRoom = copy(room);
    const nextMembership = copy(membership);
    this.#rooms.set(room.id, nextRoom);
    this.#memberships.set(membership.tokenHash, nextMembership);
    return true;
  }

  async commitRoom(room, expectedVersion, { membership, photos = [] } = {}) {
    if (room.version !== expectedVersion + 1) throw new Error('Invalid next room version');
    const current = this.#rooms.get(room.id);
    if (!current || current.version !== expectedVersion) return false;
    this.#assertInviteAvailable(room.inviteCode, room.id);
    if (membership) this.#assertMembershipAvailable(membership, room.id);
    const pendingPhotoIds = new Set();
    for (const photo of photos) {
      if (photo.roomId !== room.id || this.#photos.has(photo.id) || pendingPhotoIds.has(photo.id))
        throw new Error('Invalid or duplicate photo');
      pendingPhotoIds.add(photo.id);
    }
    const nextRoom = copy(room), nextMembership = copy(membership), nextPhotos = copy(photos);
    // No await occurs between checking the version and committing the changes.
    this.#rooms.set(room.id, nextRoom);
    if (membership) this.#memberships.set(membership.tokenHash, nextMembership);
    for (const photo of nextPhotos) this.#photos.set(photo.id, photo);
    return true;
  }

  async createPhoto(photo) {
    if (!this.#rooms.has(photo.roomId)) throw new Error('Room not found');
    if (this.#photos.has(photo.id)) throw new Error('Photo already exists');
    this.#photos.set(photo.id, copy(photo));
    return true;
  }

  async getPhoto(id) {
    return copy(this.#photos.get(id) ?? null);
  }

  #assertInviteAvailable(code, ownRoomId) {
    for (const room of this.#rooms.values()) {
      if (room.inviteCode === code && room.id !== ownRoomId) throw new Error('Invite code already exists');
    }
  }

  #assertMembershipAvailable(membership, roomId) {
    if (!membership || membership.roomId !== roomId || !membership.tokenHash || !membership.memberId)
      throw new Error('Invalid membership');
    if (this.#memberships.has(membership.tokenHash)) throw new Error('Membership token already exists');
    for (const existing of this.#memberships.values()) {
      if (existing.roomId === roomId && existing.memberId === membership.memberId)
        throw new Error('Membership already exists');
    }
  }
}

export const createMemoryStore = () => new MemoryStore();
