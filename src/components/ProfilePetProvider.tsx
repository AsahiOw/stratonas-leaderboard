'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { ProfileStudent } from '@/components/ProfileStudent'
import styles from './ProfilePetProvider.module.css'

type Student = { id: number; name: string; image: string; portrait?: string | null }
const PetContext = createContext<{
  attach: (slot: HTMLDivElement, student: Student) => void
  detach: (slot: HTMLDivElement) => void
} | null>(null)

export function ProfilePetProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [student, setStudent] = useState<Student | null>(null)
  const [attached, setAttached] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const parking = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLDivElement | null>(null)
  const active = useRef(false)

  const attach = useCallback((element: HTMLDivElement, next: Student) => {
    slot.current = element
    setStudent(current => current?.id === next.id && current.name === next.name && current.image === next.image && current.portrait === next.portrait ? current : next)
    setAttached(true)
  }, [])
  const detach = useCallback((element: HTMLDivElement) => {
    if (slot.current !== element) return
    // Park the same DOM host before the route removes its showcase slot.
    if (host.current && parking.current) {
      const computed = window.getComputedStyle(host.current)
      for (const key of ['--profile-model-height', '--club-color', '--club-rgb']) host.current.style.setProperty(key, computed.getPropertyValue(key))
      parking.current.append(host.current)
    }
    slot.current = null; setAttached(false)
    if (!active.current) setStudent(null)
  }, [])
  useLayoutEffect(() => {
    if (!attached || !slot.current || !host.current) return
    for (const key of ['--profile-model-height', '--club-color', '--club-rgb']) host.current.style.removeProperty(key)
    slot.current.append(host.current)
  }, [attached, student])

  const activityChanged = useCallback((value: boolean) => {
    active.current = value
    if (!value && !slot.current) setStudent(null)
  }, [])
  useEffect(() => { if (status === 'unauthenticated') { active.current = false; setStudent(null) } }, [status])
  const context = useMemo(() => ({ attach, detach }), [attach, detach])

  return <PetContext.Provider value={context}>
    {children}
    <div ref={parking} className={styles.parking}>
      <div ref={host} className={attached ? undefined : styles.floatingHost} data-global-profile-pet>
        {student && <ProfileStudent key={student.id} student={student} onActivityChange={activityChanged} />}
      </div>
    </div>
  </PetContext.Provider>
}

export function ProfileStudentSlot({ student }: { student: Student }) {
  const context = useContext(PetContext)!
  const element = useRef<HTMLDivElement>(null)
  const { id, name, image, portrait } = student
  useLayoutEffect(() => {
    const target = element.current!
    context.attach(target, { id, name, image, portrait })
    return () => context.detach(target)
  }, [context, id, name, image, portrait])
  return <div ref={element} data-profile-student-slot style={{ minHeight: 'calc(var(--profile-model-height) + 32px)' }} />
}
