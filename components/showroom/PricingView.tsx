"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Book, BookOpen, Sparkles, Star } from "lucide-react";
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
  const totalPrice = useMemo(() => {
    if (!selectedPkg) return null;
    const n = studentsCount;
    if (!Number.isFinite(n) || n <= 0) return null;
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
    return n * (selectedPkg.pricePerStudent + addonsTotal);
  }, [selectedPkg, studentsCount, selectedAddonIndices]);

  const handleSaveToDb = async () => {
    if (!draft) return;
    setSaveError("");
    setSaving(true);
    const toastId = toast.loading('Membuat album…', { duration: Infinity })
    try {
      const body: Record<string, unknown> = {
        type: 'yearbook',
        school_name: draft.school_name, // Map school_name (from draft)
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
              const isSelected = selectedPackageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(isSelected ? null : pkg.id)}
                  className={`relative w-[85vw] sm:w-full shrink-0 snap-center text-left rounded-3xl border-4 p-6 transition-all duration-200 ${isSelected
                    ? "border-slate-900 dark:border-slate-600 bg-emerald-200 dark:bg-emerald-900/40 shadow-[8px_8px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155] scale-100 sm:scale-[1.02] translate-x-1 translate-y-1 sm:translate-x-0 sm:translate-y-0"
                    : "border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    }`}
                >
                  {pkg.is_popular && !isSelected && (
                    <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-orange-400 dark:bg-orange-500 border-2 border-slate-900 dark:border-slate-600 text-[11px] font-black text-slate-900 dark:text-slate-900 uppercase tracking-widest shadow-[3px_3px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] rotate-2 flex items-center gap-1.5">
                      Popular <Star className="w-3 h-3 fill-slate-900" />
                    </span>
                  )}

                  {/* Header: checkbox + name + base price */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all mt-1 sm:mt-0 ${isSelected ? "border-slate-900 dark:border-slate-500 bg-slate-900 dark:bg-slate-600 text-emerald-300 dark:text-emerald-400 shadow-inner" : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"}`}>
                        {isSelected ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                      </span>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-[18px] tracking-tight">{pkg.name}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0 pl-12 sm:pl-0">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Harga dasar</p>
                      <p className="text-[20px] font-black text-slate-900 dark:text-white leading-tight">
                        Rp {pkg.pricePerStudent.toLocaleString("id-ID")}
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
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-300 dark:bg-amber-400 text-amber-950 text-[12px] font-black uppercase tracking-wider border-2 border-amber-700 dark:border-amber-300 shadow-[2px_2px_0_0_#0f172a] dark:shadow-amber-300/80">
                            <Book className="w-3.5 h-3.5" /> Flipbook
                          </span>
                        )}
                        {pkg.ai_labs_features.map((slug) => (
                          <span
                            key={slug}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider border-2 shadow-[2px_2px_0_0_#0f172a] ${slug === 'flipbook_unlock' ? 'border-amber-700 dark:border-amber-300 bg-amber-300 dark:bg-amber-400 text-amber-950 dark:shadow-amber-300/80' : 'border-slate-900 dark:border-slate-600 bg-indigo-300 dark:bg-indigo-900/50 text-slate-900 dark:text-slate-100 dark:shadow-[2px_2px_0_0_#334155]'
                              }`}
                          >
                            {slug === 'flipbook_unlock' ? <Book className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {AI_FEATURE_LABELS[slug] ?? slug}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Addon (opsional, di bawah fitur) */}
                  {parsedFeatures.some((p) => p.price > 0) && (
                    <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-700 px-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Addon</p>
                        {chosenAddons.length > 0 && (
                          <span className="bg-emerald-400 dark:bg-emerald-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a]">
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
                            ? "bg-white dark:bg-emerald-900/30 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-emerald-300"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-slate-500 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]"
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
                    <span className="text-[17px] font-black text-slate-900 dark:text-white">
                      Rp {totalPerStudent.toLocaleString("id-ID")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile Swiping Indicator Dots - Hidden on desktop */}
          <div className="flex justify-center gap-2 mt-2 mb-8 sm:hidden">
            {packages.map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-full border-2 border-slate-900 dark:border-slate-600 transition-all duration-300 ${i === activeIdx ? 'w-8 bg-emerald-400 dark:bg-emerald-500' : 'w-2.5 bg-slate-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {draft && (
          <div className="mt-8 border-t-4 border-slate-900 dark:border-slate-700 pt-8">
            {saveError ? <p className="text-[14px] font-bold text-red-500 dark:text-red-400 mb-4">{saveError}</p> : null}
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={saving || !selectedPackageId}
              className="w-full px-6 py-4 bg-indigo-400 dark:bg-indigo-600 text-slate-900 dark:text-white border-4 border-slate-900 dark:border-slate-700 rounded-2xl text-[18px] font-black uppercase tracking-widest shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#0f172a] dark:hover:shadow-[2px_2px_0_0_#334155] disabled:opacity-50 transition-all"
            >
              {saving ? "Menyimpan..." : afterSaveRedirect ? "Simpan Data ke Database" : "Simpan dan Lihat Album"}
            </button>
            <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mt-4 text-center">Pilih paket di atas lalu klik simpan.</p>
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
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-700 p-6 sm:p-8 rounded-[2.5rem] shadow-[10px_10px_0_0_#0f172a] dark:shadow-[10px_10px_0_0_#334155]"
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
                            ? "border-slate-900 dark:border-slate-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-none translate-x-[2px] translate-y-[2px]"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-slate-400 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[4px_4px_0_0_#334155]"
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
                            checked ? "bg-emerald-500 border-slate-900 dark:border-slate-500" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
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
                className="mt-8 w-full py-4 rounded-2xl border-4 border-slate-900 bg-indigo-400 dark:bg-indigo-600 text-white font-black uppercase tracking-widest shadow-[6px_6px_0_0_#0f172a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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
