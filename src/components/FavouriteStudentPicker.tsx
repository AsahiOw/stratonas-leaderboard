'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import styles from './AccountProfile.module.css'

export interface FavouriteStudentChoice {
  id: number; name: string; image: string; portrait: string | null; memorial: string | null
}

export function FavouriteStudentPicker({ currentId, onSaved, onClose, importLocked, savingLock, onImportLockChange }: {
  currentId: number | null
  onSaved: (student: FavouriteStudentChoice) => void
  onClose: () => void
  importLocked: boolean
  savingLock: boolean
  onImportLockChange: (locked: boolean) => void
}) {
  const [students, setStudents] = useState<FavouriteStudentChoice[] | null>(null)
  const [selectedId, setSelectedId] = useState(currentId)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(24)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => { searchInput.current?.focus() }, [])
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    fetch('/api/students', { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Student choices couldn’t load. Try again.')
      const data: FavouriteStudentChoice[] = await response.json()
      if (!controller.signal.aborted) setStudents(data)
    }).catch((error: Error) => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [attempt])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (selectedId === null || selectedId === currentId) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ favouriteStudentId: selectedId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Your favourite student couldn’t be saved. Try again.')
      onSaved(data.favouriteStudentData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Your favourite student couldn’t be saved. Try again.')
      setSaving(false)
    }
  }

  const filtered = students?.filter((student) => student.name.toLowerCase().includes(search.trim().toLowerCase())) || []
  const selected = students?.find((student) => student.id === selectedId)
  return <form aria-label="Choose favourite student" className={styles.studentPicker} onSubmit={save} onKeyDown={(event) => { if (event.key === 'Escape' && !saving) onClose() }}>
    <div className={styles.sectionRow}>
      <div><h2 className={styles.sectionHeading}>Choose your favourite student</h2><p className={styles.description}>Your profile will show their 3D model, or artwork if no model is available.</p></div>
      <button type="button" aria-label="Close student choices" disabled={saving} onClick={onClose} className={styles.button}><X size={17} /></button>
    </div>
    <fieldset className={styles.importLocks} disabled={savingLock}>
      <legend>Import protection</legend>
      <label><input type="checkbox" checked={importLocked} onChange={(event) => onImportLockChange(event.target.checked)} />Lock favourite student against XLSX imports</label>
      <p>You can still change your student here. Lock changes save automatically.</p>
    </fieldset>
    <label><span className="sr-only">Search students</span><input ref={searchInput} type="search" className={styles.search} value={search} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} onChange={(event) => { setSearch(event.target.value); setLimit(24) }} placeholder="Search students and variants" /></label>
    {error && <p role="alert" className={styles.pickerError}>{error}</p>}
    {!students && !error && <p role="status" className={styles.description}>Loading students…</p>}
    {!students && error && <button type="button" onClick={() => setAttempt((value) => value + 1)} className={styles.button}><RefreshCw size={15} />Try again</button>}
    <div className={styles.studentChoices}>
      {filtered.slice(0, limit).map((student) => <button type="button" key={student.id} data-student-choice={student.id} aria-pressed={selectedId === student.id} disabled={saving} onClick={() => setSelectedId(student.id)} className={styles.studentChoice}>
        <ProgressiveImage src={student.image} alt="" width={80} height={80} loading="lazy" />
        <span>{student.name}</span>
        {selectedId === student.id && <Check size={16} aria-hidden className={styles.choiceCheck} />}
      </button>)}
    </div>
    {students && filtered.length === 0 && <p className={styles.description}>No students match your search.</p>}
    {filtered.length > limit && <button type="button" onClick={() => setLimit((value) => value + 24)} className={styles.button}>Show more students</button>}
    <div className={styles.pickerFooter}>
      <p aria-live="polite">{selected ? <>Selected: <strong>{selected.name}</strong></> : 'Choose a student to continue.'}</p>
      <div className={styles.actions}>
        <button disabled={saving || selectedId === null || selectedId === currentId} className={`${styles.button} ${styles.primary}`}>{saving ? 'Saving…' : 'Save favourite'}</button>
        <button type="button" disabled={saving} onClick={onClose} className={styles.button}>Cancel</button>
      </div>
    </div>
  </form>
}
