import { DoorOpen, MapPin, Users, X } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { imageSrc } from '@/lib/utils'
import type { ChibiCatalogStudent } from '@/lib/chibi/types'
import type { PlaygroundActor } from '@/lib/chibi/playground-simulation'
import { OFFICE_SECTIONS, sectionAt } from '@/lib/chibi/playground-layout'
import styles from './StudentPlayground.module.css'

type Resident = Pick<PlaygroundActor, 'id' | 'name' | 'position' | 'ready' | 'state' | 'leaving' | 'arrivalTarget' | 'opacity' | 'label' | 'social'>
export function playgroundResidentLocation(actor: Resident) {
  return actor.arrivalTarget && actor.opacity === 0 ? 'entrance' : sectionAt(actor.position)?.id ?? 'hall'
}

export function PlaygroundRoster({ students, residents, paused, onClose, onFocusRoom, onSelect, onRemove, onRetry }: {
  students: ChibiCatalogStudent[]; residents: Resident[]; paused: boolean; onClose: () => void; onFocusRoom: (id: string) => void
  onSelect: (id: number) => void; onRemove: (id: number) => void; onRetry: (id: number) => void
}) {
  const locations = [...OFFICE_SECTIONS, { id: 'hall', name: 'Hallway', color: '#d7eef7' }, { id: 'entrance', name: 'Entrance', color: '#e8edf6' }]
  return <div className={styles.scrim} onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Current residents" className={`${styles.dialog} ${styles.rosterDialog}`} onClick={event => event.stopPropagation()}>
    <div className={styles.rosterHeading}><div><span>Schale Residence Hall</span><h2>All Locations</h2></div><button aria-label="Close current residents" onClick={onClose}><X size={24} /></button></div>
    <div className={styles.rosterSummary}><Users size={18} /><strong>{residents.length} / 21 residents</strong><span>Select a student to find them on the map.</span></div>
    <div className={styles.locationGrid}>{locations.map(location => {
      const occupants = residents.filter(actor => playgroundResidentLocation(actor) === location.id)
      if (location.id === 'entrance' && !occupants.length) return null
      return <section key={location.id} className={styles.locationCard} data-roster-room={location.id} style={{ '--room-color': location.color } as React.CSSProperties}>
        <header><button onClick={() => { if ('center' in location) onFocusRoom(location.id); else if (occupants[0]) onSelect(occupants[0].id) }}><MapPin size={18} /><h3>{location.name}</h3></button><span>{occupants.length} present</span></header>
        <div className={styles.locationResidents}>{occupants.map(actor => {
          const student = students.find(student => student.id === actor.id)!
          const walk = student.model?.profile.interactions.walk.state === 'available'
          const canLeave = !paused && !actor.leaving && (!actor.ready || actor.opacity === 0 || walk)
          return <div className={styles.residentTile} key={actor.id} data-roster-resident={actor.id}>
            <button className={styles.residentSelect} aria-label={`Find ${actor.name}`} disabled={!actor.ready || actor.opacity === 0} title={actor.name} onClick={() => onSelect(actor.id)}><span className={styles.residentImage}><ProgressiveImage src={imageSrc(student.image)} alt="" fill sizes="80px" style={{ objectFit: 'cover' }} /></span><span>{actor.name}</span></button>
            <small title={actor.label}>{actor.leaving ? 'Heading home' : actor.state === 'error' ? 'Load failed' : !actor.ready ? 'Loading…' : actor.arrivalTarget ? 'Arriving' : actor.state === 'walking' ? 'Walking' : actor.social ? 'With a friend' : 'Settled in'}</small>
            {actor.state === 'error' && <button onClick={() => onRetry(actor.id)}>Retry loading</button>}
            <button className={styles.residentLeave} aria-label={`Send ${actor.name} home`} disabled={!canLeave} onClick={() => onRemove(actor.id)}><DoorOpen size={13} />{actor.leaving ? 'Leaving…' : 'Send home'}</button>
          </div>
        })}{!occupants.length && <p className={styles.emptyRoom}>Nobody here right now</p>}</div>
      </section>
    })}</div>
  </section></div>
}
