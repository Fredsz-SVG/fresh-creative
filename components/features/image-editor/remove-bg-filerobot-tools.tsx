'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Upload, Wand2, Coins, AlertTriangle, X } from 'lucide-react'
import { TOOLS } from 'react-filerobot-image-editor'

/**
 * Warna solid mejikuhibiniu — diurutkan kolom-per-kolom (grid-auto-flow: column, 5 baris).
 * Kolom: Netral | Merah | Jingga | Kuning | Hijau | Biru | Nila | Ungu
 * Baris : muda → terang → normal → tua → gelap
 */
export const REMOVE_BG_SOLID_PRESETS: { hex: string; label: string }[] = [
  // ── Netral ──────────────────────────────────────
  { hex: '#ffffff', label: 'Putih' },
  { hex: '#d1d5db', label: 'Abu muda' },
  { hex: '#6b7280', label: 'Abu' },
  { hex: '#374151', label: 'Abu gelap' },
  { hex: '#000000', label: 'Hitam' },
  // ── Merah (M) ───────────────────────────────────
  { hex: '#fecaca', label: 'Merah muda' },
  { hex: '#f87171', label: 'Merah terang' },
  { hex: '#ef4444', label: 'Merah' },
  { hex: '#b91c1c', label: 'Merah tua' },
  { hex: '#7f1d1d', label: 'Merah gelap' },
  // ── Jingga / Oranye (E) ─────────────────────────
  { hex: '#fed7aa', label: 'Jingga muda' },
  { hex: '#fb923c', label: 'Jingga terang' },
  { hex: '#f97316', label: 'Jingga' },
  { hex: '#c2410c', label: 'Jingga tua' },
  { hex: '#7c2d12', label: 'Jingga gelap' },
  // ── Kuning (J) ──────────────────────────────────
  { hex: '#fef08a', label: 'Kuning muda' },
  { hex: '#facc15', label: 'Kuning terang' },
  { hex: '#eab308', label: 'Kuning' },
  { hex: '#a16207', label: 'Kuning tua' },
  { hex: '#713f12', label: 'Kuning gelap' },
  // ── Hijau (I) ───────────────────────────────────
  { hex: '#bbf7d0', label: 'Hijau muda' },
  { hex: '#4ade80', label: 'Hijau terang' },
  { hex: '#22c55e', label: 'Hijau' },
  { hex: '#15803d', label: 'Hijau tua' },
  { hex: '#14532d', label: 'Hijau gelap' },
  // ── Biru (K) ────────────────────────────────────
  { hex: '#bfdbfe', label: 'Biru muda' },
  { hex: '#60a5fa', label: 'Biru terang' },
  { hex: '#3b82f6', label: 'Biru' },
  { hex: '#1d4ed8', label: 'Biru tua' },
  { hex: '#1e3a8a', label: 'Biru gelap' },
  // ── Nila / Indigo (U) ───────────────────────────
  { hex: '#c7d2fe', label: 'Nila muda' },
  { hex: '#818cf8', label: 'Nila terang' },
  { hex: '#6366f1', label: 'Nila' },
  { hex: '#4338ca', label: 'Nila tua' },
  { hex: '#312e81', label: 'Nila gelap' },
  // ── Ungu / Violet (H) ───────────────────────────
  { hex: '#e9d5ff', label: 'Ungu muda' },
  { hex: '#c084fc', label: 'Ungu terang' },
  { hex: '#a855f7', label: 'Ungu' },
  { hex: '#7e22ce', label: 'Ungu tua' },
  { hex: '#581c87', label: 'Ungu gelap' },
]

const CHECKER =
  'linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)'

export type RemoveBgToolsOpts = {
  onRemoveBg: () => void
  removeBgState: 'idle' | 'removing' | 'error'
  creditsPerUse: number | null
  currentCredits: number | null
  hasRemovedBg: boolean
  onRequestBgUpload: () => void
  onPickSolidColor: (hex: string) => void
  onRestoreTransparent: () => void
}

// ── Confirmation dialog portal ───────────────────────────────────────────────

interface ConfirmDialogProps {
  creditsPerUse: number | null
  currentCredits: number | null
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({ creditsPerUse, currentCredits, onConfirm, onCancel }: ConfirmDialogProps) {
  const cost = typeof creditsPerUse === 'number' ? creditsPerUse : null
  const balance = typeof currentCredits === 'number' ? currentCredits : null
  const afterBalance = balance !== null && cost !== null ? balance - cost : null
  const insufficient = afterBalance !== null && afterBalance < 0

  const dialog = (
    <div
      style={{ zIndex: 99999 }}
      className="fixed inset-0 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog Card */}
      <div
        className="relative w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#161616', border: '1px solid #2e2e2e' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3"
          style={{ borderBottom: '1px solid #262626' }}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#60a5fa] shrink-0" />
            <span className="text-[13px] font-semibold text-[#e8e8e8] leading-tight">
              Konfirmasi Remove BG
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[#666] hover:text-[#e8e8e8] hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Credit info rows */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: '#1c1c1c', border: '1px solid #2a2a2a' }}
          >
            {/* Current balance */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #252525' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#1e3a5f' }}
                >
                  <Coins className="w-3.5 h-3.5 text-[#60a5fa]" />
                </div>
                <span className="text-[11px] text-[#9ca3af]">Saldo kamu</span>
              </div>
              <span className="text-[13px] font-bold tabular-nums text-[#e8e8e8]">
                {balance !== null ? `${balance} credit` : '—'}
              </span>
            </div>

            {/* Cost */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: '1px solid #252525' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#2d1b1b' }}
                >
                  <span className="text-[10px] font-bold text-[#f87171]">−</span>
                </div>
                <span className="text-[11px] text-[#9ca3af]">Biaya Remove BG</span>
              </div>
              <span className="text-[13px] font-bold tabular-nums text-[#f87171]">
                {cost !== null ? `${cost} credit` : '—'}
              </span>
            </div>

            {/* After */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: insufficient ? '#2d1b1b' : '#162d1f' }}
                >
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: insufficient ? '#f87171' : '#4ade80' }}
                  >
                    =
                  </span>
                </div>
                <span className="text-[11px] text-[#9ca3af]">Sisa setelah</span>
              </div>
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{ color: insufficient ? '#f87171' : '#4ade80' }}
              >
                {afterBalance !== null ? `${afterBalance} credit` : '—'}
              </span>
            </div>
          </div>

          {/* Insufficient warning */}
          {insufficient && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{ background: '#2d1111', border: '1px solid #4b1a1a' }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#f87171] leading-snug">
                Credit tidak cukup. Silakan top up terlebih dahulu.
              </p>
            </div>
          )}

          {/* Question */}
          {!insufficient && (
            <p className="text-[12px] text-[#9ca3af] text-center leading-snug">
              Apakah kamu yakin ingin melanjutkan?
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-2 px-4 pb-4"
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors"
            style={{
              background: '#252525',
              border: '1px solid #3a3a3a',
              color: '#b0b0b0',
            }}
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!!insufficient}
            onClick={() => { onConfirm() }}
            className="flex-1 px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: insufficient ? '#2a2a2a' : '#1565c0',
              border: '1px solid ' + (insufficient ? '#3a3a3a' : '#1976d2'),
              color: '#ffffff',
            }}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(dialog, document.body)
}

// ── Main tool builder ────────────────────────────────────────────────────────

export function buildRemoveBgObjectRemovalTool(opts: RemoveBgToolsOpts) {
  const {
    onRemoveBg,
    removeBgState,
    creditsPerUse,
    currentCredits,
    hasRemovedBg,
    onRequestBgUpload,
    onPickSolidColor,
    onRestoreTransparent,
  } = opts
  const busy = removeBgState === 'removing'
  const removeDone = hasRemovedBg
  const creditLine =
    typeof creditsPerUse === 'number' && creditsPerUse >= 0 ? `${creditsPerUse} credit` : null

  function RemoveBgItem() {
    return null
  }

  function RemoveBgOptions(props: { t: (k: string) => string }) {
    const { t } = props
    const [showConfirm, setShowConfirm] = useState(false)

    const actionLabel = busy ? t('removeBgRunning') : removeDone ? t('removeBgAlreadyDone') : t('removeBgRun')
    const bgDisabled = !hasRemovedBg || busy

    return (
      <div
        className="flex flex-col gap-0 w-full"
        data-testid="FIE-remove-bg-options"
      >
        {/* ── Row 1: Remove BG button ───────────────────────────── */}
        <div className="px-3 pt-2 pb-2">
          <button
            type="button"
            disabled={busy || removeDone}
            title={removeDone ? t('removeBgAlreadyDone') : t('removeBgHint')}
            onClick={() => setShowConfirm(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[12px] font-semibold border transition-colors
              border-[#3a3a3a] bg-[#252525] text-[#e8e8e8]
              hover:bg-[#2f2f2f] hover:border-[#4a4a4a]
              disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              : removeDone
                ? <span className="w-3.5 h-3.5 shrink-0 text-[#4ade80]">✓</span>
                : <Wand2 className="w-3.5 h-3.5 shrink-0" />
            }
            <span className="leading-none">{actionLabel}</span>
            {!busy && !removeDone && creditLine
              ? <span className="ml-auto text-[10px] font-normal text-[#6b7280] tabular-nums">{creditLine}</span>
              : null
            }
          </button>
        </div>

        {/* ── Confirm dialog (portal) ─────────────────────────── */}
        {showConfirm && (
          <ConfirmDialog
            creditsPerUse={creditsPerUse}
            currentCredits={currentCredits}
            onCancel={() => setShowConfirm(false)}
            onConfirm={() => {
              setShowConfirm(false)
              onRemoveBg()
            }}
          />
        )}

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="mx-3 border-t border-[#2a2a2a]" />

        {/* ── Row 2: "Latar Belakang" label + Upload button ─────── */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-between gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6b7280] shrink-0">
            {t('removeBgReplaceTitle')}
          </span>
          <button
            type="button"
            disabled={bgDisabled}
            onClick={onRequestBgUpload}
            title={t('removeBgUploadBg')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-[#363636] bg-[#232323] text-[#d4d4d4]
              hover:bg-[#2c2c2c] hover:border-[#444]
              disabled:opacity-35 disabled:pointer-events-none transition-colors shrink-0"
          >
            <Upload className="w-3 h-3 shrink-0" />
            {t('removeBgUploadBg')}
          </button>
        </div>

        {/* ── Row 3: horizontal scroll strip — transparan + semua warna ─ */}
        <div
          className="px-3 pb-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex gap-[3px]" style={{ width: 'max-content' }}>
            {/* Transparan — checkerboard swatch tanpa icon/teks */}
            <button
              type="button"
              disabled={bgDisabled}
              title={t('removeBgTransparent')}
              onClick={onRestoreTransparent}
              className="shrink-0 w-7 h-7 rounded border border-[#525252] relative overflow-hidden transition-shadow
                hover:ring-2 hover:ring-[#2196f3] hover:ring-offset-1 hover:ring-offset-[#1a1a1a]
                disabled:opacity-30 disabled:pointer-events-none"
              style={{
                backgroundImage: CHECKER,
                backgroundSize: '6px 6px',
                backgroundColor: '#2a2a2a',
              }}
            />

            {/* Gap visual antara transparan & warna solid */}
            <div className="w-px h-7 bg-[#2f2f2f] shrink-0 self-center" />

            {/* Warna solid mejikuhibiniu */}
            {REMOVE_BG_SOLID_PRESETS.map(({ hex, label }, i) => (
              <React.Fragment key={hex}>
                {/* Pemisah tipis tiap ganti grup (setiap 5 item) */}
                {i > 0 && i % 5 === 0 && (
                  <div className="w-px h-7 bg-[#2f2f2f] shrink-0 self-center" />
                )}
                <button
                  type="button"
                  disabled={bgDisabled}
                  title={`${label} (${hex})`}
                  onClick={() => onPickSolidColor(hex)}
                  className="shrink-0 w-7 h-7 rounded border border-[#3a3a3a] transition-shadow
                    hover:ring-2 hover:ring-[#2196f3] hover:ring-offset-1 hover:ring-offset-[#1a1a1a]
                    disabled:opacity-30 disabled:pointer-events-none"
                  style={{ backgroundColor: hex }}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return {
    id: TOOLS.OBJECT_REMOVAL,
    Item: RemoveBgItem,
    ItemOptions: RemoveBgOptions,
  }
}
