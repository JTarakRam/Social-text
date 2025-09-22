import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "history.json")

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(FILE_PATH)
  } catch {
    await fs.writeFile(FILE_PATH, JSON.stringify({ snaps: [] }, null, 2), "utf8")
  }
}

export async function GET() {
  await ensureFile()
  const raw = await fs.readFile(FILE_PATH, "utf8")
  return NextResponse.json(JSON.parse(raw))
}

export async function POST(request: Request) {
  await ensureFile()
  try {
    const body = await request.json()
    // Basic validation: required fields and constraints
    const { id, text, timestamp, title, tags } = body ?? {}
    if (
      typeof id !== 'string' || id.length === 0 ||
      typeof text !== 'string' || text.length === 0 || text.length > 10000 ||
      typeof timestamp !== 'number' || timestamp <= 0 || !Number.isFinite(timestamp)
    ) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    if (title && typeof title !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid title' }, { status: 400 })
    }

    if (tags && (!Array.isArray(tags) || tags.some((t: unknown) => typeof t !== 'string' || t.length > 40))) {
      return NextResponse.json({ ok: false, error: 'Invalid tags' }, { status: 400 })
    }

    const raw = await fs.readFile(FILE_PATH, "utf8")
    const data = JSON.parse(raw) as { snaps: any[] }
    data.snaps = [{ id, text, timestamp, title: title || '', tags: Array.isArray(tags) ? tags : [] }, ...data.snaps].slice(0, 100)
    await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Failed to persist history' }, { status: 500 })
  }
}


