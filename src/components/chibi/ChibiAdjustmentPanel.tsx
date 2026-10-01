'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CHIBI_ARRANGEMENT_LIMITS,
  CHIBI_MODEL_NODE_KEY,
  arrangementAdjustmentTransform,
  arrangementSavePayload,
  cloneChibiArrangement,
  diffChibiArrangement,
  setChibiArrangementAdjustment,
  setChibiArrangementVisibility,
  type ChibiArrangementDocument,
  type ChibiArrangementRecord,
  type ChibiArrangementSavePayload,
  type ChibiArrangementTransform,
} from './chibi-arrangement'

export interface ChibiAdjustmentPanelProps {
  isAdmin: boolean
  record: ChibiArrangementRecord | null
  catalogVisible: boolean
  saving?: boolean
  visibilitySaving?: boolean
  staleError?: string | null
  onPreview?: (arrangement: ChibiArrangementDocument) => void
  onSave?: (payload: ChibiArrangementSavePayload) => void | Promise<void>
  onVisibilityChange?: (visible: boolean) => void | Promise<void>
  onRefresh?: () => void | Promise<void>
}

export function getChibiArrangementDraftState(
  arrangementDefault: ChibiArrangementDocument,
  effectiveArrangement: ChibiArrangementDocument,
  draft: ChibiArrangementDocument,
) {
  const differs = (left: ChibiArrangementDocument, right: ChibiArrangementDocument) =>
    Object.keys(diffChibiArrangement(left, right).nodes).length > 0
    || Object.keys(diffChibiArrangement(right, left).nodes).length > 0
  return {
    hasUnsavedChanges: differs(effectiveArrangement, draft),
    hasSavedOverride: differs(arrangementDefault, effectiveArrangement),
  }
}

/**
 * Admin-only controls.  The panel keeps a local draft and reports it to the
 * viewer immediately; persistence is deliberately delegated to the guarded
 * parent callback so this component never becomes an authorization boundary.
 */
export function ChibiAdjustmentPanel({
  isAdmin,
  record,
  catalogVisible,
  saving = false,
  visibilitySaving = false,
  staleError = null,
  onPreview,
  onSave,
  onVisibilityChange,
  onRefresh,
}: ChibiAdjustmentPanelProps) {
  const [draft, setDraft] = useState<ChibiArrangementDocument>(() => record ? cloneChibiArrangement(record.effectiveArrangement) : { schemaVersion: 1, nodes: {} })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reloadDefaultConfirmationOpen, setReloadDefaultConfirmationOpen] = useState(false)
  const effectiveArrangement = record?.effectiveArrangement

  useEffect(() => {
    if (!effectiveArrangement) return
    const next = cloneChibiArrangement(effectiveArrangement)
    setDraft(next)
    setSaveError(null)
  }, [record?.assetId, record?.checksum, effectiveArrangement])

  if (!isAdmin || !record) return null
  const arrangementRecord = record

  const allowedNodes = arrangementRecord.allowedNodes
  const modelAllowed = allowedNodes.some(node => node.key === CHIBI_MODEL_NODE_KEY && node.kind === 'model')
  const equipmentNodes = allowedNodes.filter(node => node.kind === 'equipment' && node.key !== CHIBI_MODEL_NODE_KEY)
  const faceLayers = allowedNodes.filter(node => node.kind === 'face-layer').sort((left, right) => left.key === '$eyes' ? -1 : right.key === '$eyes' ? 1 : 0)
  const draftState = getChibiArrangementDraftState(arrangementRecord.arrangementDefault, arrangementRecord.effectiveArrangement, draft)
  const draftStateLabel = draftState.hasUnsavedChanges
    ? `Unsaved changes · ${draftState.hasSavedOverride ? 'the saved override' : 'the imported default'} remains unchanged until Save.`
    : draftState.hasSavedOverride ? 'Saved override active' : 'Matches imported default'

  function preview(next: ChibiArrangementDocument) {
    setDraft(next)
    setSaveError(null)
    onPreview?.(next)
  }

  function changeTransform(key: string, transform: ChibiArrangementTransform) {
    preview(setChibiArrangementAdjustment(draft, key, arrangementRecord.arrangementDefault.nodes[key], transform))
  }

  function changeEquipmentVisibility(key: string, visible: boolean) {
    preview(setChibiArrangementVisibility(draft, key, visible))
  }

  function reloadDefault() {
    setReloadDefaultConfirmationOpen(true)
  }

  function confirmReloadDefault() {
    preview(cloneChibiArrangement(arrangementRecord.arrangementDefault))
    setReloadDefaultConfirmationOpen(false)
  }

  async function changeVisibility(visible: boolean) {
    if (!onVisibilityChange || visibilitySaving) return
    setSaveError(null)
    try {
      await onVisibilityChange(visible)
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Visibility could not be changed.')
    }
  }

  function save() {
    if (!onSave || staleError || saving) return
    setSaveError(null)
    try {
      const override = diffChibiArrangement(arrangementRecord.arrangementDefault, draft)
      const result = onSave(arrangementSavePayload(arrangementRecord, override))
      if (result && typeof result.then === 'function') void result.catch((cause: unknown) => {
        setSaveError(cause instanceof Error ? cause.message : 'The arrangement could not be saved.')
      })
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The arrangement could not be saved.')
    }
  }

  async function refreshCurrent() {
    if (!onRefresh) return
    try {
      await onRefresh()
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The current revision could not be loaded.')
    }
  }

  return <>
    <section className="min-w-0 max-w-full rounded-2xl border border-violet-300/20 bg-violet-300/[0.04] p-5" aria-label="Chibi arrangement controls">
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-violet-300">Admin adjustment</p><p className="mt-1 text-xs leading-5 text-slate-400">Changes preview immediately. Save when the character looks right.</p><p role="status" className={`mt-2 text-xs ${draftState.hasUnsavedChanges ? 'text-amber-200' : 'text-slate-400'}`}>{draftStateLabel}</p></div>
      <span className="shrink-0 rounded-full border border-violet-300/20 px-2 py-1 text-[10px] font-mono text-violet-200">rev {record.checksum.slice(0, 10)}</span>
    </div>
    <label className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-slate-200">
      <input type="checkbox" checked={catalogVisible} disabled={visibilitySaving || !onVisibilityChange} onChange={(event) => { void changeVisibility(event.target.checked) }} />
      <span><strong className="font-medium">Show in public catalog</strong><span className="mt-0.5 block text-xs text-slate-500">Hiding preserves the asset, settings, and revision.</span></span>
    </label>
    {staleError && <div role="alert" className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100"><p>This asset changed while you were editing. Reload the current revision before saving. {staleError}</p>{onRefresh && <button type="button" onClick={() => { void refreshCurrent() }} className="mt-2 rounded border border-amber-200/30 px-2 py-1 text-[11px] text-amber-50 hover:bg-amber-200/10">Refresh current revision</button>}</div>}
    {saveError && <p role="alert" className="mt-3 rounded-lg border border-rose-300/30 bg-rose-300/10 p-3 text-xs leading-5 text-rose-100">{saveError}</p>}

    {faceLayers.length > 0 && <div className="mt-5 space-y-3" aria-label="Eyes and eyebrows">
      <p className="text-sm font-medium text-slate-200">Eyes and eyebrows</p>
      <p className="text-xs leading-5 text-slate-400">Eyes showing through hair? Choose Keep behind hair, then fine-tune depth. Eyes and mouth share a layer on some models.</p>
      {faceLayers.map(layer => <div key={layer.key} className="rounded-xl border border-white/10 bg-black/10 p-3">
        <p className="text-sm text-slate-200">{layer.label}</p>
        <label className="mt-2 block text-xs text-slate-400">Layer behavior
          <select aria-label={`${layer.label} layer behavior`} value={draft.nodes[layer.key]?.depthTest === undefined ? 'default' : draft.nodes[layer.key]?.depthTest ? 'behind' : 'overlay'} onChange={event => {
            const next = cloneChibiArrangement(draft)
            const node = { ...next.nodes[layer.key] }
            if (event.target.value === 'default') delete node.depthTest
            else node.depthTest = event.target.value === 'behind'
            if (Object.keys(node).length) next.nodes[layer.key] = node
            else delete next.nodes[layer.key]
            preview(next)
          }} className="mt-1 block w-full rounded border border-white/10 bg-slate-900 px-2 py-2 text-sm text-slate-200">
            <option value="default">Imported default</option><option value="behind">Keep behind hair</option><option value="overlay">Show on top</option>
          </select>
        </label>
        <label className="mt-3 block text-xs text-slate-400">Depth adjustment: {draft.nodes[layer.key]?.depthOffset ?? 0}
          <input aria-label={`${layer.label} depth adjustment`} type="range" min={-10} max={10} step={0.5} disabled={draft.nodes[layer.key]?.depthTest === false} value={draft.nodes[layer.key]?.depthOffset ?? 0} onChange={event => {
            const next = cloneChibiArrangement(draft)
            next.nodes[layer.key] = { ...next.nodes[layer.key], depthTest: next.nodes[layer.key]?.depthTest ?? true, depthOffset: Number(event.target.value) }
            preview(next)
          }} className="mt-2 block w-full accent-violet-400" />
        </label>
        <div className="flex justify-between text-[11px] text-slate-500"><span>Closer / in front</span><span>Farther / behind</span></div>
        {draft.nodes[layer.key]?.depthTest === false && <p className="mt-1 text-[11px] text-slate-500">Choose Keep behind hair to adjust depth.</p>}
        <button type="button" onClick={() => {
          const next = cloneChibiArrangement(draft)
          delete next.nodes[layer.key]
          preview(next)
        }} className="mt-2 text-xs text-violet-300 hover:text-violet-200">Reset {layer.label.toLowerCase()}</button>
      </div>)}
    </div>}
    <details className="mt-5 min-w-0">
    <summary className="cursor-pointer text-sm text-slate-300">Advanced: model and equipment position</summary>
    <div className="mt-3 min-w-0 space-y-4">
      {modelAllowed ? <TransformEditor label="Whole model" baseline={arrangementRecord.arrangementDefault.nodes[CHIBI_MODEL_NODE_KEY]} node={draft.nodes[CHIBI_MODEL_NODE_KEY]} onChange={(transform) => changeTransform(CHIBI_MODEL_NODE_KEY, transform)} /> : <p className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">The backend did not allow a whole-model transform for this asset.</p>}
      {equipmentNodes.length > 0 && <div className="min-w-0 space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Allowlisted equipment</p>{equipmentNodes.map((node) => <div key={node.key} className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-3"><TransformEditor label={node.label} baseline={arrangementRecord.arrangementDefault.nodes[node.key]} node={draft.nodes[node.key]} onChange={(transform) => changeTransform(node.key, transform)} /><label className="mt-3 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={draft.nodes[node.key]?.visible ?? arrangementRecord.arrangementDefault.nodes[node.key]?.visible ?? true} onChange={(event) => changeEquipmentVisibility(node.key, event.target.checked)} /> Visible in preview</label></div>)}</div>}
      {equipmentNodes.length === 0 && <p className="text-xs text-slate-500">No source-bound equipment offsets are allowlisted for this model.</p>}
    </div>
    </details>

    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" onClick={reloadDefault} disabled={saving} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">Reload default</button>
      <button type="button" onClick={save} disabled={saving || !!staleError || !onSave} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">{saving ? 'Saving…' : 'Save arrangement'}</button>
    </div>
    <p className="mt-3 text-[11px] leading-4 text-slate-500">Reload default resets the preview. Save applies your adjustments to this character.</p>
    </section>
    {reloadDefaultConfirmationOpen && <ChibiReloadDefaultDialog onCancel={() => setReloadDefaultConfirmationOpen(false)} onConfirm={confirmReloadDefault} />}
  </>
}

export function ChibiReloadDefaultDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    cancelButtonRef.current?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return <dialog ref={dialogRef} aria-modal="true" aria-labelledby="chibi-reload-default-title" aria-describedby="chibi-reload-default-description" onCancel={(event) => { event.preventDefault(); onCancel() }} className="fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-xl border border-white/15 bg-slate-900 p-5 text-white shadow-2xl backdrop:bg-black/70">
    <h2 id="chibi-reload-default-title" className="text-base font-semibold">Reload the imported default?</h2>
    <p id="chibi-reload-default-description" className="mt-2 text-sm leading-6 text-slate-300">This replaces your current editor preview with the immutable imported default. It does not save or change the stored override.</p>
    <div className="mt-5 flex justify-end gap-2">
      <button ref={cancelButtonRef} type="button" onClick={onCancel} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Cancel</button>
      <button type="button" onClick={onConfirm} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Reload Default</button>
    </div>
  </dialog>
}

function TransformEditor({ label, baseline, node, onChange }: { label: string; baseline: ChibiArrangementDocument['nodes'][string] | undefined; node: ChibiArrangementDocument['nodes'][string] | undefined; onChange: (transform: ChibiArrangementTransform) => void }) {
  const transform = arrangementAdjustmentTransform(baseline, node)
  return <fieldset className="min-w-0">
    <legend className="block max-w-full text-sm font-medium text-slate-200 [overflow-wrap:anywhere]">{label}</legend>
    <div aria-label={`${label} imported default`} className="mt-2 min-w-0 rounded-lg border border-white/10 bg-black/10 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Imported default · read-only</p>
      <dl className="mt-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[10px]">
        <dt className="text-slate-500">Position</dt><dd className="break-all font-mono text-slate-300">{formatDefaultTuple(baseline?.position)}</dd>
        <dt className="text-slate-500">Rotation quaternion</dt><dd className="break-all font-mono text-slate-300">{formatDefaultTuple(baseline?.rotation)}</dd>
        <dt className="text-slate-500">Scale</dt><dd className="break-all font-mono text-slate-300">{formatDefaultTuple(baseline?.scale)}</dd>
        <dt className="text-slate-500">Visibility</dt><dd className="text-slate-300">{formatDefaultVisibility(baseline?.visible)}</dd>
      </dl>
    </div>
    <div className="mt-2 grid min-w-0 grid-cols-1 gap-3">
      <TransformAxisGroup label="Position offset" values={transform.position} min={CHIBI_ARRANGEMENT_LIMITS.position.min} max={CHIBI_ARRANGEMENT_LIMITS.position.max} step={CHIBI_ARRANGEMENT_LIMITS.position.step} onChange={(values) => onChange({ ...transform, position: values })} />
      <TransformAxisGroup label="Rotation offset °" values={transform.rotation} min={CHIBI_ARRANGEMENT_LIMITS.rotation.min} max={CHIBI_ARRANGEMENT_LIMITS.rotation.max} step={CHIBI_ARRANGEMENT_LIMITS.rotation.step} onChange={(values) => onChange({ ...transform, rotation: values })} />
      <TransformAxisGroup label="Scale factor" values={transform.scale} min={CHIBI_ARRANGEMENT_LIMITS.scale.min} max={CHIBI_ARRANGEMENT_LIMITS.scale.max} step={CHIBI_ARRANGEMENT_LIMITS.scale.step} onChange={(values) => onChange({ ...transform, scale: values })} />
    </div>
  </fieldset>
}

function formatDefaultTuple(values: readonly number[] | undefined) {
  return values ? values.join(', ') : 'Not set in imported default'
}

function formatDefaultVisibility(visible: boolean | undefined) {
  if (typeof visible !== 'boolean') return 'Not set in imported default'
  return visible ? 'Visible' : 'Hidden'
}

function TransformAxisGroup({ label, values, min, max, step, onChange }: { label: string; values: readonly [number, number, number]; min: number; max: number; step: number; onChange: (values: [number, number, number]) => void }) {
  const axes = ['X', 'Y', 'Z'] as const
  return <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    <div className="mt-1 grid min-w-0 grid-cols-3 gap-1">
      {axes.map((axis) => <span key={axis} className="text-center text-[10px] text-slate-500">{axis}</span>)}
      {values.map((value, index) => {
        const nextAxis = axes[index]
        return <input key={nextAxis} aria-label={`${label} ${nextAxis}`} type="number" value={value} min={min} max={max} step={step} onChange={(event) => {
          const next: [number, number, number] = [...values] as [number, number, number]
          next[index] = Number(event.target.value)
          onChange(next)
        }} className="min-w-0 w-full rounded border border-white/10 bg-black/20 px-1.5 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-300/60" />
      })}
    </div>
  </div>
}
