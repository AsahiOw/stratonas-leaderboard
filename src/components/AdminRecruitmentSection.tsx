'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { StField, inputClass } from '@/components/ui/StField'
import { StModal } from '@/components/ui/StModal'
import { Toast } from '@/components/ui/Toast'
import { dateKeyFromDate } from '@/lib/recruitments'
import { fmtDate, imageSrc, proxyImage } from '@/lib/utils'

interface Student {
  id: number
  name: string
  image: string
  characterVoice?: string | null
}

interface Recruitment {
  id: string
  studentId: number
  student: Student
  bannerPath: string
  animationPath: string
  createdAt?: string
  updatedAt?: string
}

interface UpcomingRecruitment {
  id: string
  dateKey: string
  items: Array<{
    position: number
    recruitment: Recruitment
  }>
}

interface Props {
  students: Student[]
}

type MediaMode = 'file' | 'url'
type DeleteTarget = { type: 'recruitment' | 'schedule'; id: string; label: string } | null

const addBtnClass =
  'bg-accent rounded-lg px-4 py-2 text-white font-semibold text-[13px] cursor-pointer hover:bg-accent/90 transition-colors whitespace-nowrap'
const editBtnClass =
  'bg-accent/[0.12] border border-accent/30 rounded-md px-2.5 py-1 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors'
const delBtnClass =
  'bg-red/10 border border-red/25 rounded-md px-2.5 py-1 text-red text-xs hover:bg-red/20 transition-colors'
const submitBtnClass =
  'w-full bg-accent rounded-lg py-3 text-white font-bold text-sm cursor-pointer mt-1.5 hover:bg-accent/90 transition-colors disabled:cursor-not-allowed disabled:opacity-70'

function tomorrowDateKey() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return dateKeyFromDate(date)
}

export function AdminRecruitmentSection({ students }: Props) {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([])
  const [schedules, setSchedules] = useState<UpcomingRecruitment[]>([])
  const [modal, setModal] = useState<'recruitment' | 'schedule' | null>(null)
  const [editRecruitment, setEditRecruitment] = useState<Recruitment | null>(null)
  const [editSchedule, setEditSchedule] = useState<UpcomingRecruitment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [deleting, setDeleting] = useState(false)
  const [savingRecruitment, setSavingRecruitment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [recruitmentForm, setRecruitmentForm] = useState({ studentId: '', bannerPath: '', animationPath: '' })
  const [bannerMode, setBannerMode] = useState<MediaMode>('file')
  const [animationMode, setAnimationMode] = useState<MediaMode>('file')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [animationFile, setAnimationFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [animationPreview, setAnimationPreview] = useState('')
  const [studentQuery, setStudentQuery] = useState('')
  const [scheduleForm, setScheduleForm] = useState({ dateKey: '', recruitmentIds: [] as string[] })
  const [scheduleRecruitmentQuery, setScheduleRecruitmentQuery] = useState('')
  const [recruitmentLibraryQuery, setRecruitmentLibraryQuery] = useState('')
  const minScheduleDate = useMemo(() => tomorrowDateKey(), [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  const loadRecruitments = useCallback(async () => {
    const res = await fetch('/api/admin/recruitments', { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      showToast(body?.error || 'Could not load recruitments.')
      return
    }
    setRecruitments(body)
  }, [showToast])

  const loadSchedules = useCallback(async () => {
    const res = await fetch('/api/admin/upcoming-recruitments', { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      showToast(body?.error || 'Could not load upcoming recruitments.')
      return
    }
    setSchedules(body)
  }, [showToast])

  useEffect(() => {
    loadRecruitments()
    loadSchedules()
  }, [loadRecruitments, loadSchedules])

  useEffect(() => {
    if (!bannerPreview.startsWith('blob:')) return
    return () => URL.revokeObjectURL(bannerPreview)
  }, [bannerPreview])

  useEffect(() => {
    if (!animationPreview.startsWith('blob:')) return
    return () => URL.revokeObjectURL(animationPreview)
  }, [animationPreview])

  function firstStudentId() {
    return students[0] ? String(students[0].id) : ''
  }

  function studentLabel(student: Student) {
    return `${student.name || 'Unnamed student'} (#${student.id})`
  }

  function availableStudentsForRecruitment() {
    const usedStudentIds = new Set(
      recruitments
        .filter((recruitment) => recruitment.id !== editRecruitment?.id)
        .map((recruitment) => recruitment.studentId)
    )
    return students.filter((student) => !usedStudentIds.has(student.id))
  }

  function openAddRecruitment() {
    if (savingRecruitment) return
    setError(null)
    setEditRecruitment(null)
    setRecruitmentForm({ studentId: firstStudentId(), bannerPath: '', animationPath: '' })
    setStudentQuery(students[0] ? studentLabel(students[0]) : '')
    setBannerMode('file')
    setAnimationMode('file')
    setBannerFile(null)
    setAnimationFile(null)
    setBannerPreview('')
    setAnimationPreview('')
    setModal('recruitment')
  }

  function openEditRecruitment(recruitment: Recruitment) {
    if (savingRecruitment) return
    setError(null)
    setEditRecruitment(recruitment)
    setStudentQuery(studentLabel(recruitment.student))
    setRecruitmentForm({
      studentId: String(recruitment.studentId),
      bannerPath: recruitment.bannerPath || '',
      animationPath: recruitment.animationPath || '',
    })
    setBannerMode('file')
    setAnimationMode('file')
    setBannerFile(null)
    setAnimationFile(null)
    setBannerPreview('')
    setAnimationPreview('')
    setModal('recruitment')
  }

  function openAddSchedule() {
    setError(null)
    setEditSchedule(null)
    setScheduleForm({ dateKey: minScheduleDate, recruitmentIds: [] })
    setScheduleRecruitmentQuery('')
    setModal('schedule')
  }

  function openEditSchedule(schedule: UpcomingRecruitment) {
    setError(null)
    setEditSchedule(schedule)
    setScheduleForm({
      dateKey: schedule.dateKey || '',
      recruitmentIds: schedule.items.map((item) => item.recruitment.id),
    })
    setScheduleRecruitmentQuery('')
    setModal('schedule')
  }

  async function saveRecruitment(event: React.FormEvent) {
    event.preventDefault()
    if (savingRecruitment) return
    setError(null)
    const selectedStudent = students.find((student) => studentLabel(student).toLowerCase() === studentQuery.trim().toLowerCase())
      || students.find((student) => student.name.toLowerCase() === studentQuery.trim().toLowerCase())
      || students.find((student) => String(student.id) === studentQuery.trim())

    if (!selectedStudent) {
      const message = 'Choose a student from the search results.'
      setError(message)
      showToast(message)
      return
    }
    if (!availableStudentsForRecruitment().some((student) => student.id === selectedStudent.id)) {
      const message = 'This student already has a recruitment.'
      setError(message)
      showToast(message)
      return
    }

    const payload = new FormData()
    payload.append('studentId', String(selectedStudent.id))
    payload.append('bannerPath', recruitmentForm.bannerPath)
    payload.append('animationPath', recruitmentForm.animationPath)
    if (bannerMode === 'file' && bannerFile) payload.append('bannerFile', bannerFile)
    if (animationMode === 'file' && animationFile) payload.append('animationFile', animationFile)

    setSavingRecruitment(true)
    try {
      const res = editRecruitment
        ? await fetch(`/api/admin/recruitments/${editRecruitment.id}`, { method: 'PUT', body: payload })
        : await fetch('/api/admin/recruitments', { method: 'POST', body: payload })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const message = body?.error || 'Could not save recruitment.'
        setError(message)
        showToast(message)
        return
      }

      showToast(editRecruitment ? 'Recruitment updated.' : 'Recruitment added.')
      setModal(null)
      await Promise.all([loadRecruitments(), loadSchedules()])
    } finally {
      setSavingRecruitment(false)
    }
  }

  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const res = editSchedule
      ? await fetch(`/api/admin/upcoming-recruitments/${editSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      })
      : await fetch('/api/admin/upcoming-recruitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      const message = body?.error || 'Could not save upcoming recruitment.'
      setError(message)
      showToast(message)
      return
    }

    showToast(editSchedule ? 'Upcoming recruitment updated.' : 'Upcoming recruitment added.')
    setModal(null)
    loadSchedules()
  }

  function toggleScheduleRecruitment(id: string) {
    setScheduleForm((form) => ({
      ...form,
      recruitmentIds: form.recruitmentIds.includes(id)
        ? form.recruitmentIds.filter((recruitmentId) => recruitmentId !== id)
        : [...form.recruitmentIds, id],
    }))
  }

  const filteredScheduleRecruitments = recruitments.filter((recruitment) => {
    const query = scheduleRecruitmentQuery.trim().toLowerCase()
    if (!query) return true
    return [
      recruitment.student.name,
      recruitment.student.characterVoice,
      recruitment.bannerPath,
      recruitment.animationPath,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const filteredRecruitments = recruitments.filter((recruitment) => {
    const query = recruitmentLibraryQuery.trim().toLowerCase()
    if (!query) return true
    return [
      recruitment.student.name,
      recruitment.studentId,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const url = deleteTarget.type === 'recruitment'
        ? `/api/admin/recruitments/${deleteTarget.id}`
        : `/api/admin/upcoming-recruitments/${deleteTarget.id}`
      const res = await fetch(url, { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(body?.error || 'Could not delete item.')
        return
      }
      showToast(deleteTarget.type === 'recruitment' ? 'Recruitment deleted.' : 'Upcoming recruitment deleted.')
      setDeleteTarget(null)
      await Promise.all([loadRecruitments(), loadSchedules()])
    } finally {
      setDeleting(false)
    }
  }

  const todayKey = dateKeyFromDate()
  const nextSchedule = schedules.find((schedule) => schedule.dateKey > todayKey) || null
  const displayedSchedules = [...schedules].reverse()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-bold text-lg">Recruitment</div>
          <div className="mt-1 text-xs text-muted2">Home banner queue and gacha asset library.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={openAddSchedule}
          className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/45 hover:bg-card2"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Home Queue</div>
              <div className="mt-1 text-2xl font-bold text-text">{schedules.length}</div>
            </div>
            <div className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white transition-colors group-hover:bg-accent/90">
              Add Date
            </div>
          </div>
          <div className="mt-2 text-xs text-muted2">
            {nextSchedule ? `Next: ${fmtDate(nextSchedule.dateKey)} with ${nextSchedule.items.length} recruitments` : 'No upcoming dates'}
          </div>
        </button>

        <button
          type="button"
          onClick={openAddRecruitment}
          className="group rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-accent/45 hover:bg-card2"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Asset Library</div>
              <div className="mt-1 text-2xl font-bold text-text">{recruitments.length}</div>
            </div>
            <div className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white transition-colors group-hover:bg-accent/90">
              Add Recruitment
            </div>
          </div>
          <div className="mt-2 text-xs text-muted2">
            {recruitments.length > 0 ? 'Ready to schedule on the home page' : 'No banners or animations yet'}
          </div>
        </button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-sm">Home Screen Queue</div>
            <div className="mt-1 text-xs text-muted">Latest dates appear first. The next future date is marked.</div>
          </div>
          <button type="button" onClick={openAddSchedule} className={addBtnClass}>+ Add Date</button>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border2 bg-bg py-12 text-center text-sm text-muted">
            No upcoming recruitment dates.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {displayedSchedules.map((schedule) => {
              const isNextSchedule = schedule.id === nextSchedule?.id
              return (
                <div
                  key={schedule.id}
                  className={`rounded-xl border p-4 ${isNextSchedule ? 'border-accent/40 bg-accent/[0.08]' : 'border-border bg-bg'}`}
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-mono text-lg font-bold text-text">{fmtDate(schedule.dateKey)}</div>
                        {isNextSchedule && (
                          <span className="rounded-md border border-accent/35 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                            Next on home
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {schedule.items.length} recruitment{schedule.items.length === 1 ? '' : 's'} selected
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => openEditSchedule(schedule)} className={editBtnClass}>Edit</button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: 'schedule', id: schedule.id, label: fmtDate(schedule.dateKey) })}
                        className={delBtnClass}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    {schedule.items.map((item) => (
                      <div key={item.recruitment.id} className="overflow-hidden rounded-lg border border-border2 bg-card2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageSrc(item.recruitment.bannerPath)}
                          alt=""
                          className="aspect-[16/6] w-full object-cover"
                          onError={e => (e.currentTarget.style.display = 'none')}
                        />
                        <div className="px-2.5 py-2">
                          <div className="truncate text-xs font-bold">{item.recruitment.student.name}</div>
                          <div className="truncate text-[11px] text-muted">CV: {item.recruitment.student.characterVoice || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-sm">Recruitment Library</div>
            <div className="mt-1 text-xs text-muted">Each card pairs one student, one banner, and one animation.</div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className={`${inputClass} sm:w-64`}
              type="search"
              value={recruitmentLibraryQuery || ''}
              onChange={e => setRecruitmentLibraryQuery(e.target.value)}
              placeholder="Search student..."
              aria-label="Search recruitment library by student"
            />
            <button type="button" onClick={openAddRecruitment} className={addBtnClass}>+ Add Recruitment</button>
          </div>
        </div>

        {recruitments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border2 bg-bg py-12 text-center text-sm text-muted">
            No recruitment assets.
          </div>
        ) : filteredRecruitments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border2 bg-bg py-12 text-center text-sm text-muted">
            No recruitments match {recruitmentLibraryQuery.trim()}.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRecruitments.map((recruitment) => (
              <div key={recruitment.id} className="overflow-hidden rounded-xl border border-border bg-bg">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc(recruitment.bannerPath)}
                    alt={recruitment.student.name}
                    className="aspect-[16/6] w-full object-cover"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
                <div className="p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{recruitment.student.name}</div>
                      <div className="truncate text-[11px] text-muted">CV: {recruitment.student.characterVoice || '—'}</div>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proxyImage(recruitment.student.image)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] text-muted">
                    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
                      <div className="font-bold uppercase tracking-[0.08em] text-muted2">Banner</div>
                      <div className="truncate">{recruitment.bannerPath}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card px-2 py-1.5">
                      <div className="font-bold uppercase tracking-[0.08em] text-muted2">Animation</div>
                      <div className="truncate">{recruitment.animationPath}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => openEditRecruitment(recruitment)} className={editBtnClass}>Edit</button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'recruitment', id: recruitment.id, label: recruitment.student.name })}
                      className={delBtnClass}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal === 'recruitment' && (
        <StModal title={editRecruitment ? 'Edit Recruitment' : 'Add Recruitment'} onClose={() => {
          if (savingRecruitment) return
          setError(null)
          setModal(null)
        }} extraWide>
          <form onSubmit={saveRecruitment} onChange={() => error && setError(null)} aria-busy={savingRecruitment}>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold" style={{ color: '#ef4444' }}>
                {error}
              </div>
            )}
            <fieldset disabled={savingRecruitment} className="disabled:opacity-70">
              <StField label="STUDENT" span2>
                <input
                  className={inputClass}
                  type="text"
                  list="recruitment-student-options"
                  value={studentQuery || ''}
                  onChange={e => {
                    const value = e.target.value
                    const selectedStudent = students.find((student) => studentLabel(student).toLowerCase() === value.trim().toLowerCase())
                    setStudentQuery(value)
                    setRecruitmentForm((form) => ({ ...form, studentId: selectedStudent ? String(selectedStudent.id) : '' }))
                  }}
                  placeholder="Search student..."
                  required
                />
                <datalist id="recruitment-student-options">
                  {availableStudentsForRecruitment().map((student) => (
                    <option key={student.id} value={studentLabel(student)} />
                  ))}
                </datalist>
                {availableStudentsForRecruitment().length === 0 && (
                  <div className="mt-1.5 text-xs text-muted">Every student already has a recruitment.</div>
                )}
              </StField>

              <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                <StField label="BANNER">
                  <div className="mb-2 inline-flex rounded-lg border border-border2 bg-card2 p-1">
                    {(['file', 'url'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${bannerMode === mode ? 'bg-accent text-white' : 'text-muted2 hover:text-text'}`}
                        onClick={() => {
                          setBannerMode(mode)
                          if (mode === 'url') {
                            setBannerFile(null)
                            setBannerPreview('')
                          }
                        }}
                      >
                        {mode === 'file' ? 'Media' : 'URL'}
                      </button>
                    ))}
                  </div>
                  {bannerMode === 'file' ? (
                    <input
                      className={inputClass}
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setBannerFile(file)
                        setBannerPreview(file ? URL.createObjectURL(file) : '')
                      }}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      type="text"
                      value={recruitmentForm.bannerPath || ''}
                      onChange={e => setRecruitmentForm((form) => ({ ...form, bannerPath: e.target.value }))}
                      placeholder="https://... or /assets/gacha/banner/..."
                    />
                  )}
                </StField>

                <StField label="ANIMATION">
                  <div className="mb-2 inline-flex rounded-lg border border-border2 bg-card2 p-1">
                    {(['file', 'url'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${animationMode === mode ? 'bg-accent text-white' : 'text-muted2 hover:text-text'}`}
                        onClick={() => {
                          setAnimationMode(mode)
                          if (mode === 'url') {
                            setAnimationFile(null)
                            setAnimationPreview('')
                          }
                        }}
                      >
                        {mode === 'file' ? 'Media' : 'URL'}
                      </button>
                    ))}
                  </div>
                  {animationMode === 'file' ? (
                    <input
                      className={inputClass}
                      type="file"
                      accept="video/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setAnimationFile(file)
                        setAnimationPreview(file ? URL.createObjectURL(file) : '')
                      }}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      type="text"
                      value={recruitmentForm.animationPath || ''}
                      onChange={e => setRecruitmentForm((form) => ({ ...form, animationPath: e.target.value }))}
                      placeholder="https://... or /assets/gacha/animation/..."
                    />
                  )}
                </StField>
              </div>

              {(bannerPreview || recruitmentForm.bannerPath || animationPreview || recruitmentForm.animationPath) && (
                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(bannerPreview || recruitmentForm.bannerPath) && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Banner preview</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bannerPreview || imageSrc(recruitmentForm.bannerPath)}
                        alt="Banner preview"
                        className="h-28 w-full rounded-xl border border-border object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  {(animationPreview || recruitmentForm.animationPath) && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Animation preview</div>
                      <video
                        src={animationPreview || imageSrc(recruitmentForm.animationPath)}
                        className="h-28 w-full rounded-xl border border-border object-cover"
                        muted
                        loop
                        playsInline
                        controls
                      />
                    </div>
                  )}
                </div>
              )}
            </fieldset>
            {savingRecruitment && (
              <div role="status" aria-live="polite" className="mb-3 rounded-xl border border-accent/30 bg-accent/[0.08] px-3 py-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" aria-hidden="true" />
                  {editRecruitment ? 'Saving recruitment changes...' : 'Adding recruitment...'}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-card2">
                  <div className="h-full w-full animate-pulse rounded-full bg-accent" />
                </div>
                <div className="mt-2 text-xs text-muted2">Uploading media and refreshing the recruitment list.</div>
              </div>
            )}
            <button type="submit" className={submitBtnClass} disabled={savingRecruitment}>
              {savingRecruitment ? 'Working...' : editRecruitment ? 'Save Changes' : 'Add Recruitment'}
            </button>
          </form>
        </StModal>
      )}

      {modal === 'schedule' && (
        <StModal title={editSchedule ? 'Edit Upcoming Recruitment' : 'Add Upcoming Recruitment'} onClose={() => { setError(null); setModal(null) }} extraWide>
          <form onSubmit={saveSchedule} onChange={() => error && setError(null)}>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold" style={{ color: '#ef4444' }}>
                {error}
              </div>
            )}
            <StField label="DATE">
              <input
                className={inputClass}
                type="date"
                min={minScheduleDate}
                value={scheduleForm.dateKey || ''}
                onChange={e => setScheduleForm((form) => ({ ...form, dateKey: e.target.value }))}
                required
              />
            </StField>
            <StField label="RECRUITMENTS" span2>
              <input
                className={`${inputClass} mb-2`}
                type="search"
                value={scheduleRecruitmentQuery || ''}
                onChange={e => setScheduleRecruitmentQuery(e.target.value)}
                placeholder="Search recruitments by student, voice, or file path..."
                aria-label="Search recruitments"
              />
              <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-auto rounded-xl border border-border bg-bg p-2 sm:grid-cols-2">
                {filteredScheduleRecruitments.map((recruitment) => {
                  const checked = scheduleForm.recruitmentIds.includes(recruitment.id)
                  return (
                    <label
                      key={recruitment.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors ${checked ? 'border-accent/50 bg-accent/10' : 'border-border bg-card2 hover:border-border2'}`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checked)}
                        onChange={() => toggleScheduleRecruitment(recruitment.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc(recruitment.bannerPath)}
                        alt=""
                        className="h-10 w-16 rounded-md object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{recruitment.student.name}</span>
                    </label>
                  )
                })}
                {recruitments.length === 0 && <div className="p-4 text-center text-sm text-muted">Create a recruitment first.</div>}
                {recruitments.length > 0 && filteredScheduleRecruitments.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted">No recruitments match your search.</div>
                )}
              </div>
            </StField>
            <button type="submit" className={submitBtnClass}>{editSchedule ? 'Save Changes' : 'Add Upcoming Recruitment'}</button>
          </form>
        </StModal>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'schedule' ? 'Delete upcoming recruitment?' : 'Delete recruitment?'}
        message={deleteTarget?.type === 'schedule'
          ? 'This will remove the scheduled home-page recruitment group.'
          : 'This will remove the recruitment and delete its saved banner and animation files.'}
        confirmLabel="Delete"
        isLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      >
        <div className="font-semibold text-text">{deleteTarget?.label}</div>
      </ConfirmModal>

      {toast && <Toast message={toast} />}
    </div>
  )
}
