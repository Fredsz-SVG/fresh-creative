"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Book, BookOpen, Sparkles, Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardTitle from "@/components/dashboard/DashboardTitle";
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'
import { toast } from '@/lib/toast'

export type Draft = {
  school_name: string;
  province_id?: string;
  province_name?: string | null;
  school_city: string;
  kab_kota: string;
  pic_name: string;
  wa_e164: string;
  students_count: number | null;
  source: string | null;
};

export type PricingPackage = {
  id: string;
  name: string;
  pricePerStudent: number;
  minStudents: number;
  features: string[];
  flipbook_enabled: boolean;
  ai_labs_features: string[];
  is_popular: boolean;
};

const AI_FEATURE_LABELS: Record<string, string> = {
  tryon: "Try On",
  pose: "Pose",
  photogroup: "Photo Group",
  phototovideo: "Photo to Video",
  image_remove_bg: "Image Editor",
  flipbook_unlock: "Flipbook",
};

const DEFAULT_PACKAGES: PricingPackage[] = [
  { id: "basic", name: "Paket Basic", pricePerStudent: 85000, minStudents: 100, features: ["Cover standar", "24 halaman", "Foto kelas + individu", "Soft copy"], flipbook_enabled: false, ai_labs_features: [], is_popular: false },
  { id: "standard", name: "Paket Standard", pricePerStudent: 120000, minStudents: 100, features: ["Cover pilihan", "32 halaman", "Foto kelas + individu + acara", "Soft copy", "Konsultasi 1x"], flipbook_enabled: false, ai_labs_features: [], is_popular: true },
  { id: "premium", name: "Paket Premium", pricePerStudent: 165000, minStudents: 80, features: ["Cover custom", "40 halaman", "Semua foto + layout eksklusif", "Soft copy + hard cover", "Konsultasi 2x", "Dedicated PIC"], flipbook_enabled: true, ai_labs_features: ["tryon", "pose", "photogroup", "phototovideo", "image_remove_bg"], is_popular: false },
];

export type PricingViewProps = {
  draftKey: string;
  leadIdKey: string;
  /** Redirect jika tidak ada draft & tidak ada lead_id */
  redirectNoDraft: string;
  /** Link "Kembali" saat belum simpan */
  backHrefNoDraft: string;
  /** Link "Kembali" setelah tersimpan */
  backHrefSaved: string;
  source: "showroom" | "admin";
  /** Setelah simpan, redirect ke sini (admin: /admin/albums). User: undefined = panggil /api/albums lalu redirect ke backHrefSaved */
  afterSaveRedirect?: string;
};

export default function PricingView({
  draftKey,
  leadIdKey,
  redirectNoDraft,
  backHrefNoDraft,
  backHrefSaved,
  source,
  afterSaveRedirect,
}: PricingViewProps) {
  const router = useRouter();
  const [leadId, setLeadId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [storageChecked, setStorageChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  /** Untuk paket yang dipilih: indeks addon yang di-check (hanya addon dengan price > 0). */
  const [selectedAddonIndices, setSelectedAddonIndices] = useState<Record<string, number[]>>({});
  const [packages, setPackages] = useState<PricingPackage[]>(DEFAULT_PACKAGES);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [openAddonPkgId, setOpenAddonPkgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherApplying, setVoucherApplying] = useState(false)
  const [voucherPercentOff, setVoucherPercentOff] = useState<number | null>(null)
  const [voucherError, setVoucherError] = useState<string>('')
  const voucherStorageKey = `pricing_voucher_v1:${source}`

  const toggleAddon = (pkgId: string, addonIndex: number) => {
    setSelectedAddonIndices((prev) => {
      const current = prev[pkgId] ?? [];
      const has = current.includes(addonIndex);
      const next = has ? current.filter((i) => i !== addonIndex) : [...current, addonIndex].sort((a, b) => a - b);
      return { ...prev, [pkgId]: next };
    });
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, offsetWidth } = scrollRef.current;
    if (offsetWidth === 0) return;
    const index = Math.round(scrollLeft / (offsetWidth * 0.85 + 24));
    setActiveIdx(index);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(voucherStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string; percent_off?: number }
        if (typeof parsed?.code === 'string') setVoucherCode(parsed.code)
        if (typeof parsed?.percent_off === 'number') setVoucherPercentOff(parsed.percent_off)
      }
    } catch {
      // ignore
    }
  }, [mounted, voucherStorageKey])

  // Re-validate persisted voucher on refresh so expired vouchers don't "stick".
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    const code = voucherCode.trim()
    const pct = voucherPercentOff ?? 0
    if (!code || pct <= 0) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/discount-vouchers/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          skipAuth: true,
        })
        const data = (await res.json().catch(() => ({}))) as any
        if (cancelled) return
        if (!res.ok) {
          setVoucherPercentOff(null)
          setVoucherError(String(data?.error || 'Voucher tidak valid.'))
          try {
            window.sessionStorage.removeItem(voucherStorageKey)
          } catch {
            // ignore
          }
          return
        }
        const nextPct = Number(data?.percent_off)
        if (Number.isFinite(nextPct) && nextPct > 0) {
          setVoucherPercentOff(nextPct)
          setVoucherCode(String(data?.code || code).toUpperCase())
          try {
            window.sessionStorage.setItem(
              voucherStorageKey,
              JSON.stringify({ code: String(data?.code || code).toUpperCase(), percent_off: nextPct })
            )
          } catch {
            // ignore
          }
        }
      } catch {
        // Ignore network issues on refresh; we'll validate again on submit.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [mounted, voucherCode, voucherPercentOff, voucherStorageKey])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const lid = sessionStorage.getItem(leadIdKey) ?? null;
    setLeadId(lid);
    try {
      const raw = sessionStorage.getItem(draftKey);
      const parsed = raw ? (JSON.parse(raw) as Draft) : null;
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
    setStorageChecked(true);
  }, [mounted, draftKey, leadIdKey]);

  useEffect(() => {
    let cancelled = false;
    fetchWithAuth("/api/pricing")
      .then((res) => res.ok ? res.json() : [])
      .then((data: unknown[]) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((p: Record<string, unknown>) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? ""),
            pricePerStudent: Number(p.price_per_student ?? p.pricePerStudent ?? 0),
            minStudents: Number(p.min_students ?? p.minStudents ?? 100),
            features: Array.isArray(p.features) ? p.features.map(String) : [],
            flipbook_enabled: !!p.flipbook_enabled,
            ai_labs_features: Array.isArray(p.ai_labs_features) ? p.ai_labs_features.map(String) : [],
            is_popular: !!p.is_popular,
          }));
          normalized.sort((a, b) => a.pricePerStudent - b.pricePerStudent);
          setPackages(normalized);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoadingPackages(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!storageChecked || leadId || (draft !== null && draft !== undefined)) return;
    router.replace(redirectNoDraft);
  }, [storageChecked, leadId, draft, redirectNoDraft, router]);

  const studentsCount = draft?.students_count ?? 0;
  const selectedPkg = useMemo(
    () => packages.find((p) => p.id === selectedPackageId),
    [selectedPackageId, packages]
  );

  const selectedPkgParsedFeatures = useMemo(() => {
    if (!selectedPkg) return []
    return selectedPkg.features.map((f) => {
      try {
        const j = JSON.parse(f)
        return { name: j.name || f, price: Number(j.price) || 0 }
      } catch {
        return { name: f, price: 0 }
      }
    })
  }, [selectedPkg])

  const selectedAddonsBreakdown = useMemo(() => {
    if (!selectedPkg) return []
    const chosen = selectedAddonIndices[selectedPkg.id] ?? []
    return chosen
      .map((idx) => selectedPkgParsedFeatures[idx])
      .filter((x): x is { name: string; price: number } => !!x && typeof x.price === 'number' && x.price > 0)
  }, [selectedPkg, selectedAddonIndices, selectedPkgParsedFeatures])

  const pricePerStudentBreakdown = useMemo(() => {
    if (!selectedPkg) return null
    const addonsTotal = selectedAddonsBreakdown.reduce((sum, a) => sum + (a.price ?? 0), 0)
    const basePerStudent = selectedPkg.pricePerStudent
    const subtotalPerStudent = basePerStudent + addonsTotal
    const pct = voucherPercentOff ?? 0
    const discountedPerStudent = pct > 0 ? Math.max(0, Math.round(subtotalPerStudent * (1 - pct / 100))) : subtotalPerStudent
    return {
      basePerStudent,
      addonsTotal,
      subtotalPerStudent,
      discountedPerStudent,
      percentOff: pct,
      discountAmountPerStudent: Math.max(0, subtotalPerStudent - discountedPerStudent),
    }
  }, [selectedPkg, selectedAddonsBreakdown, voucherPercentOff])
  const totalPrice = useMemo(() => {
    if (!selectedPkg) return null;
    const parsed = selectedPkg.features.map((f) => {
      try {
        const j = JSON.parse(f);
        return { name: j.name || f, price: Number(j.price) || 0 };
      } catch {
        return { name: f, price: 0 };
      }
    });
    const chosen = selectedAddonIndices[selectedPkg.id] ?? [];
    const addonsTotal = chosen.reduce((sum, idx) => sum + (parsed[idx]?.price ?? 0), 0);
    // Harga per siswa
    const pricePerStudent = selectedPkg.pricePerStudent + addonsTotal;
    // Total estimasi seluruh album = harga per siswa * jumlah siswa
    const baseTotal = pricePerStudent * (draft?.students_count || 1);
    const pct = voucherPercentOff ?? 0
    if (pct > 0) {
      const discounted = Math.round(baseTotal * (1 - pct / 100))
      return Math.max(0, discounted)
    }
    return baseTotal;
  }, [selectedPkg, selectedAddonIndices, draft?.students_count, voucherPercentOff]);

  const handleApplyVoucher = async () => {
    const clean = voucherCode.trim()
    if (!clean) {
      setVoucherError('Masukkan kode voucher.')
      setVoucherPercentOff(null)
      return
    }
    setVoucherApplying(true)
    setVoucherError('')
    try {
      const res = await fetchWithAuth('/api/discount-vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
        skipAuth: true,
      })
      const data = (await res.json().catch(() => ({}))) as any
      if (!res.ok) {
        setVoucherPercentOff(null)
        setVoucherError(String(data?.error || 'Voucher tidak valid.'))
        return
      }
      const pct = Number(data?.percent_off)
      if (!Number.isFinite(pct) || pct <= 0) {
        setVoucherPercentOff(null)
        setVoucherError('Voucher tidak valid.')
        return
      }
      setVoucherPercentOff(pct)
      setVoucherCode(String(data?.code || clean).toUpperCase())
      try {
        window.sessionStorage.setItem(voucherStorageKey, JSON.stringify({ code: String(data?.code || clean).toUpperCase(), percent_off: pct }))
      } catch {
        // ignore
      }
    } catch {
      setVoucherPercentOff(null)
      setVoucherError('Gagal memvalidasi voucher.')
    } finally {
      setVoucherApplying(false)
    }
  }

  const handleClearVoucher = () => {
    setVoucherPercentOff(null)
    setVoucherError('')
    setVoucherCode('')
    try {
      window.sessionStorage.removeItem(voucherStorageKey)
    } catch {
      // ignore
    }
  }

  const handleSaveToDb = async () => {
    if (!draft) return;
    setSaveError("");
    setSaving(true);
    const toastId = toast.loading('Membuat album…', { duration: Infinity })
    try {
      const body: Record<string, unknown> = {
        type: 'yearbook',
        name: draft.school_name, // Backend expects 'name' for the album name
        school_name: draft.school_name, // Also send school_name just in case
        province_id: draft.province_id,
        province_name: draft.province_name,
        school_city: draft.school_city,
        kab_kota: draft.kab_kota,
        pic_name: draft.pic_name,
        wa_e164: draft.wa_e164,
        students_count: draft.students_count,
        source: draft.source ?? source,
      };

      if (selectedPackageId && totalPrice != null) {
        body.pricing_package_id = selectedPackageId;
        body.total_estimated_price = totalPrice;
      }
      if ((voucherPercentOff ?? 0) > 0 && voucherCode.trim()) {
        body.discount_voucher_code = voucherCode.trim()
      }

      // DIRECTLY call /api/albums instead of /api/leads
      const res = await fetchWithAuth("/api/albums", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resText = await res.text();
      let json: { id?: string; error?: string } = {};
      try {
        json = resText ? JSON.parse(resText) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        const msg = json?.error ?? "Gagal menyimpan."
        setSaveError(msg);
        toast.error(msg)
        setSaving(false);
        return;
      }

      // Using 'id' from album as the stored ID
      const newAlbumId = json.id ?? null;
      sessionStorage.removeItem(draftKey);
      if (newAlbumId) sessionStorage.setItem(leadIdKey, newAlbumId);

      setDraft(null);
      setLeadId(newAlbumId);

      // Force Next.js to invalidate cached routes so albums page shows fresh data
      router.refresh();

      toast.success('Album berhasil dibuat.')
      if (afterSaveRedirect) {
        router.push(afterSaveRedirect);
        return;
      }

      router.push(backHrefSaved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error"
      setSaveError(msg);
      toast.error(msg)
    } finally {
      toast.dismiss(toastId)
      setSaving(false);
    }
  };

  if (!mounted || loadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 dark:border-lime-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 bg-white dark:bg-slate-950">
      <div className="max-w-2xl mx-auto">
        <Link
          href={leadId ? backHrefSaved : backHrefNoDraft}
          className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <DashboardTitle
          title="Pilih Paket"
          subtitle="Tentukan paket terbaik untuk project-mu sekarang."
        />

        <div className="mt-8">
          {/* Horizontal scroll on mobile, vertical list on desktop */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto pt-6 pb-10 -mx-4 px-4 gap-6 snap-x snap-mandatory sm:flex-col sm:space-y-6 sm:overflow-visible sm:pt-0 sm:pb-0 sm:mx-0 sm:px-0 no-scrollbar select-none"
          >
            {packages.map((pkg) => {
              const parsedFeatures = pkg.features.map((f) => {
                try {
                  const j = JSON.parse(f);
                  return { name: j.name || f, price: Number(j.price) || 0 };
                } catch {
                  return { name: f, price: 0 };
                }
              });
              const chosenAddons = selectedAddonIndices[pkg.id] ?? [];
              const addonsTotal = chosenAddons.reduce((sum, idx) => sum + (parsedFeatures[idx]?.price ?? 0), 0);
              const totalPerStudent = pkg.pricePerStudent + addonsTotal;
              const pct = voucherPercentOff ?? 0
              const discountedPerStudent = pct > 0 ? Math.round(totalPerStudent * (1 - pct / 100)) : null
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(isSelected ? null : pkg.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPackageId(isSelected ? null : pkg.id);
                    }
                  }}
                  className={`text-left cursor-pointer relative w-[85vw] sm:w-full shrink-0 snap-center rounded-3xl border-4 p-6 transition-all duration-200 flex flex-col ${isSelected
                    ? "border-slate-200 dark:border-slate-600 bg-emerald-200 dark:bg-emerald-900/40 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] scale-100 sm:scale-[1.02] translate-x-1 translate-y-1 sm:translate-x-0 sm:translate-y-0"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    }`}
                >
                  {pkg.is_popular && !isSelected && (
                    <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-orange-400 dark:bg-orange-500 border-2 border-slate-200 dark:border-slate-600 text-[11px] font-black text-slate-900 dark:text-slate-900 uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] rotate-2 flex items-center gap-1.5">
                      Popular <Star className="w-3 h-3 fill-slate-900" />
                    </span>
                  )}

                  {/* Header: checkbox + name + base price */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all mt-1 sm:mt-0 ${isSelected ? "border-slate-200 dark:border-slate-500 bg-slate-900 dark:bg-slate-600 text-emerald-300 dark:text-emerald-400 shadow-inner" : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"}`}>
                        {isSelected ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                      </span>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-[18px] tracking-tight">{pkg.name}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0 pl-12 sm:pl-0">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Harga dasar</p>
                      <p className="text-[20px] font-black text-slate-900 dark:text-white leading-tight">
                        {pct > 0 ? (
                          <span className="inline-flex flex-col items-start sm:items-end leading-tight">
                            <span className="text-[12px] font-black text-slate-600 dark:text-slate-400 line-through">
                              Rp {pkg.pricePerStudent.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[20px] font-black text-slate-900 dark:text-white">
                              Rp {Math.max(0, Math.round(pkg.pricePerStudent * (1 - pct / 100))).toLocaleString("id-ID")}
                            </span>
                          </span>
                        ) : (
                          <>Rp {pkg.pricePerStudent.toLocaleString("id-ID")}</>
                        )}
                      </p>
                      <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">/ siswa</p>
                    </div>
                  </div>

                  {/* Divider - hanya tampil kalau ada fitur included, supaya di atas Termasuk cuma 1 garis */}
                  {parsedFeatures.filter((p) => p.price === 0).length > 0 && (
                    <div className={`my-5 border-t ${isSelected ? 'border-emerald-300 dark:border-emerald-600' : 'border-slate-100 dark:border-slate-700'}`} />
                  )}

                  {/* Features (included) */}
                  <ul className="space-y-2 ml-1/2 px-1">
                    {parsedFeatures.filter((p) => p.price === 0).map((parsed, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-[14px] font-bold ${isSelected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={3} />
                        <span>{parsed.name}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Termasuk: Flipbook & AI Labs (fitur dulu) */}
                  {(pkg.flipbook_enabled || pkg.ai_labs_features.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 px-1">
                      <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Termasuk</p>
                      <div className="flex flex-wrap gap-2">
                        {pkg.flipbook_enabled && !pkg.ai_labs_features.includes('flipbook_unlock') && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-300 dark:bg-amber-400 text-amber-950 text-[12px] font-black uppercase tracking-wider border-2 border-amber-700 dark:border-amber-300 shadow-[4px_4px_0_0_#334155] dark:shadow-amber-300/80">
                            <Book className="w-3.5 h-3.5" /> Flipbook
                          </span>
                        )}
                        {pkg.ai_labs_features.map((slug) => (
                          <span
                            key={slug}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider border-2 shadow-[4px_4px_0_0_#334155] ${slug === 'flipbook_unlock' ? 'border-amber-700 dark:border-amber-300 bg-amber-300 dark:bg-amber-400 text-amber-950 dark:shadow-amber-300/80' : 'border-slate-200 dark:border-slate-600 bg-indigo-300 dark:bg-indigo-900/50 text-slate-900 dark:text-slate-100 dark:shadow-[4px_4px_0_0_#1e293b]'
                              }`}
                          >
                            {slug === 'flipbook_unlock' ? <Book className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {AI_FEATURE_LABELS[slug] ?? slug}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    {/* Addon (opsional, di bawah fitur) */}
                    {parsedFeatures.some((p) => p.price > 0) && (
                      <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-700 px-1">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Addon</p>
                          {chosenAddons.length > 0 && (
                            <span className="bg-emerald-400 dark:bg-emerald-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155]">
                              {chosenAddons.length} Dipilih
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenAddonPkgId(pkg.id);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl border-2 transition-all font-black uppercase text-[11px] tracking-wider ${
                            isSelected
                              ? "bg-white dark:bg-emerald-900/30 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-emerald-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-500 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                          } active:translate-x-0 active:translate-y-0 active:shadow-none`}
                        >
                          {chosenAddons.length > 0 ? "Ubah Add-on" : "Pilih Add-on"}
                        </button>
                      </div>
                    )}

                    {/* Estimasi total */}
                    <div className={`mt-5 pt-4 border-t-2 ${isSelected ? 'border-emerald-300 dark:border-emerald-600' : 'border-slate-100 dark:border-slate-700'} flex items-center justify-between px-1`}>
                      <span className="text-[13px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                        Harga total per siswa
                      </span>
                      {pct > 0 && discountedPerStudent != null ? (
                        <span className="text-right leading-tight">
                          <span className="block text-[11px] font-black text-slate-600 dark:text-slate-400 line-through">
                            Rp {totalPerStudent.toLocaleString("id-ID")}
                          </span>
                          <span className="block text-[17px] font-black text-slate-900 dark:text-white">
                            Rp {Math.max(0, discountedPerStudent).toLocaleString("id-ID")}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[17px] font-black text-slate-900 dark:text-white">
                          Rp {totalPerStudent.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Swiping Indicator Dots - Hidden on desktop */}
          <div className="flex justify-center gap-2 mt-2 mb-8 sm:hidden">
            {packages.map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full border-2 border-slate-200 dark:border-slate-600 transition-all duration-300 ${i === activeIdx ? 'w-8 bg-emerald-400 dark:bg-emerald-500' : 'w-2.5 bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {draft && (
          <div className="mt-8 border-t-4 border-slate-200 dark:border-slate-700 pt-8">
            {saveError ? <p className="text-[14px] font-bold text-red-500 dark:text-red-400 mb-4">{saveError}</p> : null}
            
            {selectedPkg ? (
              <div className="mb-6 flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 border-slate-900 dark:border-white bg-lime-300 dark:bg-slate-800 text-center shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] transition-all animate-in zoom-in-95 duration-300 -rotate-1 hover:rotate-0">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest mb-0.5">
                  Paket Smart Digital
                </p>
                <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  {selectedPkg.name}
                </p>
              </div>
            ) : (
              <div className="mb-6 flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-center border-dashed">
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
                  Belum ada paket yang dipilih
                </p>
              </div>
            )}

            {selectedPkg && pricePerStudentBreakdown && (
              <div className="mb-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Ringkasan biaya
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                      {draft.students_count || 0} siswa
                    </p>
                  </div>
                  {(voucherPercentOff ?? 0) > 0 && voucherCode.trim() ? (
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                        Voucher aktif
                      </p>
                      <p className="mt-1 text-xs font-black text-slate-900 dark:text-white font-mono tracking-wider">
                        {voucherCode.trim()}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Harga dasar / siswa</span>
                    <span>Rp {pricePerStudentBreakdown.basePerStudent.toLocaleString('id-ID')}</span>
                  </div>
                  {pricePerStudentBreakdown.addonsTotal > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Add-on dipilih</span>
                        <span>+Rp {pricePerStudentBreakdown.addonsTotal.toLocaleString('id-ID')}</span>
                      </div>
                      <ul className="pl-4 list-disc text-[11px] font-bold text-slate-500 dark:text-slate-400 space-y-0.5">
                        {selectedAddonsBreakdown.map((a, i) => (
                          <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-3">
                            <span className="truncate">{a.name}</span>
                            <span className="shrink-0">+Rp {a.price.toLocaleString('id-ID')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                  <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                    <span>Subtotal / siswa</span>
                    <span>Rp {pricePerStudentBreakdown.subtotalPerStudent.toLocaleString('id-ID')}</span>
                  </div>

                  {(pricePerStudentBreakdown.percentOff ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                      <span>Diskon {pricePerStudentBreakdown.percentOff}%</span>
                      <span>-Rp {pricePerStudentBreakdown.discountAmountPerStudent.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
                    <span>Total / siswa</span>
                    <span>Rp {pricePerStudentBreakdown.discountedPerStudent.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                Voucher diskon (opsional)
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={voucherCode}
                  onChange={(e) => {
                    setVoucherCode(e.target.value.toUpperCase())
                    setVoucherError('')
                    setVoucherPercentOff(null)
                  }}
                  placeholder="KODEVOUCHER"
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-black tracking-widest uppercase text-sm focus:outline-none focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={voucherApplying || !voucherCode.trim()}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-emerald-400 text-emerald-950 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#334155] flex items-center justify-center gap-2"
                  >
                    {voucherApplying ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} /> : null}
                    Terapkan
                  </button>
                  {(voucherPercentOff ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleClearVoucher}
                      className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
              {voucherError ? (
                <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400">{voucherError}</p>
              ) : (voucherPercentOff ?? 0) > 0 ? (
                <p className="mt-2 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                  Diskon diterapkan: {voucherPercentOff}% OFF
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={saving || !selectedPackageId}
              className="group flex items-center justify-center gap-3 w-full px-6 py-3 sm:py-4 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-[14px] sm:text-[18px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#334155] transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  <span>Memproses...</span>
                </>
              ) : afterSaveRedirect ? (
                "Ajukan Pendaftaran"
              ) : (
                "Simpan dan Lihat Album"
              )}
            </button>
          </div>
        )}

        {leadId && !draft && (
          <p className="mt-8 text-[13px] font-bold text-slate-500 dark:text-slate-400 text-center">
            Lead ID: <span className="text-slate-900 dark:text-white font-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border-2 border-slate-300 dark:border-slate-600">{leadId}</span>
          </p>
        )}
      </div>

      {/* Modal Add-on Digital (Showroom) */}
      <AnimatePresence>
        {openAddonPkgId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenAddonPkgId(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 p-6 sm:p-8 rounded-[2.5rem] shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-sans text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Pilih Add-on
                </h3>
                <button
                  onClick={() => setOpenAddonPkgId(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-950 dark:text-white"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 pb-6 custom-scrollbar">
                {(() => {
                  const pkg = packages.find(p => p.id === openAddonPkgId);
                  if (!pkg) return null;
                  const parsedFeatures = pkg.features.map((f) => {
                    try {
                      const j = JSON.parse(f);
                      return { name: j.name || f, price: Number(j.price) || 0 };
                    } catch {
                      return { name: f, price: 0 };
                    }
                  });
                  const chosenAddons = selectedAddonIndices[pkg.id] ?? [];

                  return parsedFeatures.map((parsed, i) => {
                    if (parsed.price === 0) return null;
                    const checked = chosenAddons.includes(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          checked
                            ? "border-slate-200 dark:border-slate-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-none translate-x-[2px] translate-y-[2px]"
                            : "border-slate-200 dark:border-slate-200 bg-slate-50 dark:bg-slate-800/30 hover:border-slate-400 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                        }`}
                      >
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddon(pkg.id, i)}
                            className="sr-only"
                          />
                          <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            checked ? "bg-emerald-500 border-slate-200 dark:border-slate-500" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                          }`}>
                            {checked && <Check className="h-4 w-4 text-slate-900" strokeWidth={4} />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight">{parsed.name}</p>
                          <p className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">+Rp {parsed.price.toLocaleString("id-ID")}</p>
                        </div>
                      </label>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => setOpenAddonPkgId(null)}
                className="mt-8 w-full py-4 rounded-2xl border-2 border-slate-200 bg-indigo-400 dark:bg-indigo-600 text-white font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Selesai
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
