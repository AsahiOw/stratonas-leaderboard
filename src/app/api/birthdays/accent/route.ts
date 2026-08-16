import { POST as updateStudentAccent } from '@/app/api/students/accent/route'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return updateStudentAccent(req)
}
