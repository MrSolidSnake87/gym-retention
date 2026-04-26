import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), '.gym-data');

export interface Member {
  id?: number | string;
  gym_id?: string;
  name: string;
  join_date: string;
  payment_status: string;
  last_activity: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

interface Database {
  members: (Member & { id: number })[];
  uploads: { id: number; filename: string; uploadDate: string; memberCount: number }[];
  nextMemberId: number;
}

function getDbPath(): string {
  return path.join(dbPath, 'data.json');
}

function ensureDbDir() {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
}

function loadDb(): Database {
  ensureDbDir();
  const filePath = getDbPath();

  if (!fs.existsSync(filePath)) {
    return { members: [], uploads: [], nextMemberId: 1 };
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { members: [], uploads: [], nextMemberId: 1 };
  }
}

function saveDb(db: Database) {
  ensureDbDir();
  const filePath = getDbPath();
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
}

export function initDb() {
  ensureDbDir();
  loadDb(); // Just ensure the file exists
}

export function addMember(member: Member) {
  const db = loadDb();
  const newMember: Member & { id: number } = {
    ...member,
    id: db.nextMemberId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.members.push(newMember);
  db.nextMemberId++;
  saveDb(db);
  return newMember;
}

export function getAllMembers(): Member[] {
  const db = loadDb();
  return db.members.sort((a, b) => {
    const dateA = new Date(a.join_date).getTime();
    const dateB = new Date(b.join_date).getTime();
    return dateB - dateA;
  });
}

export function getMemberById(id: number): Member | undefined {
  const db = loadDb();
  return db.members.find((m) => m.id === id);
}

export function clearMembers() {
  const db = loadDb();
  db.members = [];
  saveDb(db);
}

export function recordUpload(filename: string, memberCount: number) {
  const db = loadDb();
  db.uploads.push({
    id: db.uploads.length + 1,
    filename,
    uploadDate: new Date().toISOString(),
    memberCount,
  });
  saveDb(db);
}
