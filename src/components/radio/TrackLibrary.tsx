'use client'
/* eslint-disable react-hooks/refs -- dnd-kit supplies callback refs and live transform values. */

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { memo, useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Disc3, GripVertical, Play, Search, StepForward, X } from 'lucide-react'
import { RadioArtwork } from './RadioArtwork'
import { formatRadioTime, type RadioTrack } from './RadioPlayerProvider'
import styles from './RadioPage.module.css'

type Props = {
  tracks: RadioTrack[]
  queued: RadioTrack[]
  available: RadioTrack[]
  currentId: string | null
  selectedId: string | null
  queueSearch: string
  availableSearch: string
  mobilePanel: 'player' | 'media' | 'queue'
  onQueueSearch: (value: string) => void
  onAvailableSearch: (value: string) => void
  onSelect: (id: string) => void
  onPlay: (id: string) => void
  onPlayNext: (id: string) => void
  onQueue: (ids: string[]) => void
  onMove: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onAnnounce: (message: string) => void
}

export const TrackLibrary = memo(function TrackLibrary(props: Props) {
  const tracksPerBank = 5
  const [bank, setBank] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const matches = (track: RadioTrack, query: string) => `${track.displayTitle} ${track.title}`.toLowerCase().includes(query.trim().toLowerCase())
  const visibleQueue = props.queued.filter((track) => matches(track, props.queueSearch))
  const visibleAvailable = props.available.filter((track) => matches(track, props.availableSearch))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const bankCount = Math.max(1, Math.ceil(props.tracks.length / tracksPerBank))
  const bankTracks = props.tracks.slice(bank * tracksPerBank, (bank + 1) * tracksPerBank)
  const selectedTrack = bankTracks.find((track) => track.id === props.selectedId)

  useEffect(() => {
    const selectedIndex = props.tracks.findIndex((track) => track.id === props.selectedId)
    if (selectedIndex >= 0) setBank(Math.floor(selectedIndex / tracksPerBank))
  }, [props.selectedId, props.tracks])

  function changeBank(nextBank: number) {
    const safeBank = Math.max(0, Math.min(bankCount - 1, nextBank))
    const firstTrack = props.tracks[safeBank * tracksPerBank]
    setBank(safeBank)
    if (firstTrack) props.onSelect(firstTrack.id)
  }

  function loadSelectedDisc() {
    if (!selectedTrack || loadingId) return
    setLoadingId(selectedTrack.id)
    props.onPlay(selectedTrack.id)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setLoadingId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || id === props.currentId) return

    if (overId === 'available-drawer' || props.available.some((track) => track.id === overId)) {
      props.onQueue(props.queued.map((track) => track.id).filter((trackId) => trackId !== id))
      props.onAnnounce('Moved disc to the media archive.')
      return
    }

    const queue = props.queued.map((track) => track.id).filter((trackId) => trackId !== id)
    const index = overId === 'queue-drawer' ? queue.length : queue.indexOf(overId)
    queue.splice(index < 0 ? queue.length : index, 0, id)
    props.onQueue(queue)
    props.onAnnounce('Play order updated.')
  }

  return (
    <section className={`${styles.libraryConsole} ${styles[`mobilePanel_${props.mobilePanel}`]}`} aria-label="Media library and play queue">
      <header className={styles.libraryHeader}>
        <span>MEDIA STORAGE UNIT</span><b>MD BANK / 01–{String(props.tracks.length).padStart(2, '0')}</b>
      </header>

      <section className={styles.discMagazine} aria-label="Five-disc quick selector">
        <div className={styles.magazineRail}>
          <span>5-DISC CHANGER MAGAZINE</span>
          <b>BANK {String(bank + 1).padStart(2, '0')} / {String(bankCount).padStart(2, '0')}</b>
        </div>
        <div className={styles.magazineSlots} role="listbox" aria-label={`Disc bank ${bank + 1}`}>
          {Array.from({ length: tracksPerBank }, (_, slotIndex) => {
            const track = bankTracks[slotIndex]
            const trackIndex = bank * tracksPerBank + slotIndex
            const selected = track?.id === props.selectedId
            const loading = track?.id === loadingId
            return track ? (
              <button
                type="button"
                role="option"
                aria-selected={selected}
                key={track.id}
                onClick={() => props.onSelect(track.id)}
                onAnimationEnd={() => loading && setLoadingId(null)}
                className={`${styles.magazineSlot} ${selected ? styles.magazineSlotSelected : ''} ${loading ? styles.magazineSlotLoading : ''}`}
                title={`${track.displayTitle} — ${formatRadioTime(track.durationSeconds || 0)}`}
              >
                <span className={styles.slotHeader}><i /> SLOT {String(trackIndex + 1).padStart(2, '0')}</span>
                <span className={styles.slotMouth} />
                <span className={styles.magazineDisc}><RadioArtwork src={track.thumbnailUrl} alt="" sizes="110px" eager /><i /></span>
                <span className={styles.slotLabel}>{track.displayTitle}</span>
              </button>
            ) : (
              <span className={`${styles.magazineSlot} ${styles.magazineSlotEmpty}`} aria-hidden="true" key={`empty-${slotIndex}`}>
                <span className={styles.slotHeader}><i /> SLOT {String(trackIndex + 1).padStart(2, '0')}</span>
                <span className={styles.slotMouth} />
                <span className={styles.emptySlotPlate}>EMPTY</span>
              </span>
            )
          })}
        </div>
        <div className={styles.magazineControls}>
          <button type="button" disabled={bank === 0 || Boolean(loadingId)} onClick={() => changeBank(bank - 1)} aria-label="Previous disc bank"><ChevronLeft size={15} /> PREV BANK</button>
          <button type="button" className={styles.loadDiscButton} disabled={!selectedTrack || Boolean(loadingId)} onClick={loadSelectedDisc}><Disc3 size={17} /> {loadingId ? 'LOADING…' : 'LOAD DISC'}</button>
          <button type="button" disabled={bank >= bankCount - 1 || Boolean(loadingId)} onClick={() => changeBank(bank + 1)} aria-label="Next disc bank">NEXT BANK <ChevronRight size={15} /></button>
        </div>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className={styles.drawerGrid}>
          <MediaDrawer
            id="queue-drawer"
            label="PLAY ORDER"
            counter={props.queued.length}
            tracks={visibleQueue}
            search={props.queueSearch}
            onSearch={props.onQueueSearch}
            currentId={props.currentId}
            actions={(track) => (
              <>
                <button type="button" onClick={() => props.onPlay(track.id)} aria-label={`Play ${track.displayTitle} now`}><Play size={15} /></button>
                <button type="button" onClick={() => props.onMove(track.id, -1)} aria-label={`Move ${track.displayTitle} up`}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => props.onMove(track.id, 1)} aria-label={`Move ${track.displayTitle} down`}><ChevronDown size={14} /></button>
                <button type="button" disabled={track.id === props.currentId} onClick={() => props.onRemove(track.id)} aria-label={`Remove ${track.displayTitle}`}><X size={14} /></button>
              </>
            )}
          />
          <MediaDrawer
            id="available-drawer"
            label="DISC ARCHIVE"
            counter={props.available.length}
            tracks={visibleAvailable}
            search={props.availableSearch}
            onSearch={props.onAvailableSearch}
            actions={(track) => (
              <>
                <button type="button" onClick={() => props.onPlayNext(track.id)} aria-label={`Play ${track.displayTitle} next`}><StepForward size={14} /></button>
                <button type="button" onClick={() => props.onPlay(track.id)} aria-label={`Play ${track.displayTitle} now`}><Play size={14} /></button>
              </>
            )}
          />
        </div>
      </DndContext>
    </section>
  )
})

function MediaDrawer({ id, label, counter, tracks, search, onSearch, currentId, actions }: {
  id: string; label: string; counter: number; tracks: RadioTrack[]; search: string
  onSearch: (value: string) => void; currentId?: string | null; actions: (track: RadioTrack) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section ref={setNodeRef} className={`${styles.mediaDrawer} ${isOver ? styles.drawerOver : ''}`}>
      <div className={styles.drawerHandle}><span>{label}</span><b>{String(counter).padStart(2, '0')}</b></div>
      <label className={styles.drawerSearch}><Search size={13} /><input aria-label={`Search ${label.toLowerCase()}`} value={search} onChange={(event) => onSearch(event.target.value)} placeholder="SEARCH INDEX" />{search && <button type="button" onClick={() => onSearch('')} aria-label={`Clear ${label.toLowerCase()} search`}><X size={12} /></button>}</label>
      <SortableContext items={tracks.map((track) => track.id)} strategy={verticalListSortingStrategy}>
        <div className={styles.drawerContents}>
          {tracks.length === 0 && <div className={styles.emptyDrawer}>— EMPTY —</div>}
          {tracks.map((track, index) => <SortableMediaRow key={track.id} track={track} index={index} current={track.id === currentId} actions={actions(track)} />)}
        </div>
      </SortableContext>
    </section>
  )
}

function SortableMediaRow({ track, index, current, actions }: { track: RadioTrack; index: number; current: boolean; actions: React.ReactNode }) {
  const sortable = useSortable({ id: track.id, disabled: current })
  return (
    <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} className={`${styles.mediaRow} ${current ? styles.mediaRowCurrent : ''} ${sortable.isDragging ? styles.mediaRowDragging : ''}`}>
      <button type="button" {...sortable.attributes} {...sortable.listeners} disabled={current} className={styles.grip} aria-label={`Drag ${track.displayTitle}`}><GripVertical size={14} /></button>
      <span className={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.rowTitle}>{track.displayTitle}</span>
      <span className={styles.rowTime}>{current ? 'ON AIR' : formatRadioTime(track.durationSeconds || 0)}</span>
      <span className={styles.rowActions}>{actions}</span>
    </div>
  )
}
