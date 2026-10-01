import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChibiAdjustmentPanel, ChibiReloadDefaultDialog, getChibiArrangementDraftState } from './ChibiAdjustmentPanel'
import type { ChibiArrangementDocument, ChibiArrangementRecord } from './chibi-arrangement'

const arrangementDefault: ChibiArrangementDocument = {
  schemaVersion: 1,
  nodes: {
    '$model': { visible: true, position: [0.125, 0.25, 0.375], rotation: [0, 0, 0.3826834323650898, 0.9238795325112867], scale: [1.1, 1.2, 1.3] },
    'equipment:rifle': { visible: false, position: [0, 0.1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  },
}

const effectiveArrangement: ChibiArrangementDocument = {
  schemaVersion: 1,
  nodes: {
    '$model': { ...arrangementDefault.nodes.$model, position: [0.425, 0.25, 0.375] },
    'equipment:rifle': { ...arrangementDefault.nodes['equipment:rifle'], visible: true },
  },
}

const arrangementRecord: ChibiArrangementRecord = {
  assetId: 'asset-1',
  checksum: 'revision-1',
  arrangementDefault,
  effectiveArrangement,
  allowedNodes: [
    { key: '$model', kind: 'model', label: 'Whole model' },
    { key: 'equipment:rifle', kind: 'equipment', label: 'Rifle source identity' },
  ],
}

test('simple face controls preview saved depth edits and keep transforms under advanced', () => {
  const markup = renderToStaticMarkup(createElement(ChibiAdjustmentPanel, {
    isAdmin: true, catalogVisible: true,
    record: { ...arrangementRecord,
      allowedNodes: [...arrangementRecord.allowedNodes, { key: '$eyes', kind: 'face-layer', label: 'Eyes / mouth' }],
      effectiveArrangement: { ...effectiveArrangement, nodes: { ...effectiveArrangement.nodes, '$eyes': { depthTest: true, depthOffset: -2 } } },
    },
  }))
  assert.match(markup, /Eyes and eyebrows/)
  assert.match(markup, /value="behind" selected=""/)
  assert.match(markup, /type="range"[^>]*value="-2"/)
  assert.match(markup, /<details[^>]*><summary[^>]*>Advanced:/)
  assert.match(markup, /Reset eyes \/ mouth/)
})

test('arrangement controls are not rendered for non-admins', () => {
  const markup = renderToStaticMarkup(createElement(ChibiAdjustmentPanel, {
    isAdmin: false,
    record: null,
    catalogVisible: true,
  }))

  assert.equal(markup, '')
})

test('read-only transform and visibility values come from the imported default, not the effective override', () => {
  const markup = renderToStaticMarkup(createElement(ChibiAdjustmentPanel, {
    isAdmin: true,
    record: arrangementRecord,
    catalogVisible: true,
  }))

  assert.match(markup, /Whole model imported default/)
  assert.match(markup, /Rifle source identity imported default/)
  assert.equal(markup.match(/Imported default · read-only/g)?.length, 2)
  assert.match(markup, /0\.125, 0\.25, 0\.375/)
  assert.match(markup, /0, 0, 0\.3826834323650898, 0\.9238795325112867/)
  assert.match(markup, /1\.1, 1\.2, 1\.3/)
  assert.match(markup, /<dt class="text-slate-500">Visibility<\/dt><dd class="text-slate-300">Visible<\/dd>/)
  assert.match(markup, /<dt class="text-slate-500">Visibility<\/dt><dd class="text-slate-300">Hidden<\/dd>/)
  assert.doesNotMatch(markup, /0\.425, 0\.25, 0\.375/)
  assert.match(markup, /Saved override active/)
})

test('draft state distinguishes unsaved edits from the saved override and imported default', () => {
  const changedDraft: ChibiArrangementDocument = {
    ...effectiveArrangement,
    nodes: { ...effectiveArrangement.nodes, '$model': { ...effectiveArrangement.nodes.$model, position: [0.2, 0.25, 0.375] } },
  }

  assert.deepEqual(getChibiArrangementDraftState(arrangementDefault, arrangementDefault, arrangementDefault), {
    hasUnsavedChanges: false,
    hasSavedOverride: false,
  })
  assert.deepEqual(getChibiArrangementDraftState(arrangementDefault, effectiveArrangement, effectiveArrangement), {
    hasUnsavedChanges: false,
    hasSavedOverride: true,
  })
  assert.deepEqual(getChibiArrangementDraftState(arrangementDefault, effectiveArrangement, arrangementDefault), {
    hasUnsavedChanges: true,
    hasSavedOverride: true,
  })
  assert.deepEqual(getChibiArrangementDraftState(arrangementDefault, effectiveArrangement, changedDraft), {
    hasUnsavedChanges: true,
    hasSavedOverride: true,
  })
})

test('reload confirmation is a labelled modal with cancel and explicit preview reset actions', () => {
  const markup = renderToStaticMarkup(createElement(ChibiReloadDefaultDialog, {
    onCancel: () => {},
    onConfirm: () => {},
  }))

  assert.match(markup, /<dialog[^>]*aria-modal="true"[^>]*aria-labelledby="chibi-reload-default-title"[^>]*aria-describedby="chibi-reload-default-description"/)
  assert.match(markup, /Reload the imported default\?/)
  assert.match(markup, /This replaces your current editor preview with the immutable imported default\. It does not save or change the stored override\./)
  assert.match(markup, />Cancel<\/button>/)
  assert.match(markup, />Reload Default<\/button>/)
  assert.doesNotMatch(markup, /Save arrangement/)
})
