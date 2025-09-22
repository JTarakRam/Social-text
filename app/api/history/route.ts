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
  const body = await request.json()
  const raw = await fs.readFile(FILE_PATH, "utf8")
  const data = JSON.parse(raw) as { snaps: any[] }
  data.snaps = [body, ...data.snaps].slice(0, 100)
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8")
  return NextResponse.json({ ok: true })
}


