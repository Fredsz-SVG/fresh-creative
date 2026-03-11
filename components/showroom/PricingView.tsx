"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Book, Sparkles, Star } from "lucide-react";
import DashboardTitle from "@/components/dashboard/DashboardTitle";
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'

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
  const [packages, setPackages] = useState<PricingPackage[]>(DEFAULT_PACKAGES);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const n = Math.max(selectedPkg.minStudents, studentsCount || selectedPkg.minStudents);
    let addonsTotal = 0;
    selectedPkg.features.forEach((f) => {
      try {
        const j = JSON.parse(f);
        if (j.price) addonsTotal += Number(j.price);
      } catch { }
    });
    return (n * selectedPkg.pricePerStudent) + (n * addonsTotal);
  }, [selectedPkg, studentsCount]);

  const handleSaveToDb = async () => {
    if (!draft) return;
    setSaveError("");
    setSaving(true);
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
        setSaveError(json?.error ?? "Gagal menyimpan.");
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

      if (afterSaveRedirect) {
        router.push(afterSaveRedirect);
        return;
      }

      router.push(backHrefSaved);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-lime-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href={leadId ? backHrefSaved : backHrefNoDraft}
          className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
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
              const n = Math.max(pkg.minStudents, studentsCount || pkg.minStudents);
              let addonsTotal = 0;
              pkg.features.forEach((f) => {
                try {
                  const j = JSON.parse(f);
                  if (j.price) addonsTotal += Number(j.price);
                } catch { }
              });
              const total = n * (pkg.pricePerStudent + addonsTotal);
              const isSelected = selectedPackageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(isSelected ? null : pkg.id)}
                  className={`relative w-[85vw] sm:w-full shrink-0 snap-center text-left rounded-3xl border-4 p-6 transition-all duration-200 ${isSelected
                    ? "border-slate-900 bg-emerald-200 shadow-[8px_8px_0_0_#0f172a] scale-100 sm:scale-[1.02] translate-x-1 translate-y-1 sm:translate-x-0 sm:translate-y-0"
                    : "border-slate-900 bg-white shadow-[6px_6px_0_0_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    }`}
                >
                  {pkg.is_popular && !isSelected && (
                    <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-orange-400 border-2 border-slate-900 text-[11px] font-black text-slate-900 uppercase tracking-widest shadow-[3px_3px_0_0_#0f172a] rotate-2 flex items-center gap-1.5">
                      Popular <Star className="w-3 h-3 fill-slate-900" />
                    </span>
                  )}

                  {/* Header: checkbox + name + price */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all mt-1 sm:mt-0 ${isSelected ? "border-slate-900 bg-slate-900 text-emerald-300 shadow-inner" : "border-slate-300 bg-slate-50"}`}>
                        {isSelected ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                      </span>
                      <div>
                        <span className="font-black text-slate-900 text-[18px] tracking-tight">{pkg.name}</span>
                        <p className="text-[13px] font-bold text-slate-600 mt-1">min. {pkg.minStudents} siswa</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0 pl-12 sm:pl-0">
                      <p className="text-[20px] font-black text-slate-900 leading-tight">
                        Rp {(pkg.pricePerStudent + addonsTotal).toLocaleString("id-ID")}
                      </p>
                      <p className="text-[12px] font-bold text-slate-500 mt-0.5">/ siswa</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className={`my-5 border-t-2 ${isSelected ? 'border-emerald-300' : 'border-slate-100'}`} />

                  {/* Features list */}
                  <ul className="space-y-2 ml-1/2 px-1">
                    {pkg.features.map((f, i) => {
                      let parsed = { name: f, price: 0 }
                      try {
                        const j = JSON.parse(f)
                        if (j.name) parsed = j
                      } catch { }
                      return (
                        <li key={i} className={`flex items-start gap-2 text-[14px] font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />
                          <span>{parsed.name}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {/* Flipbook & AI Labs badges */}
                  {(pkg.flipbook_enabled || pkg.ai_labs_features.length > 0) && (
                    <div className="mt-5 flex flex-wrap gap-2 px-1">
                      {pkg.flipbook_enabled && !pkg.ai_labs_features.includes('flipbook_unlock') && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-200 text-slate-900 text-[12px] font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
                          <Book className="w-3.5 h-3.5" /> Flipbook
                        </span>
                      )}
                      {pkg.ai_labs_features.map((slug) => (
                        <span
                          key={slug}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] ${slug === 'flipbook_unlock' ? 'bg-orange-200 text-slate-900' : 'bg-indigo-300 text-slate-900'
                            }`}
                        >
                          {slug === 'flipbook_unlock' ? <Book className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {AI_FEATURE_LABELS[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Estimasi total */}
                  <div className={`mt-5 pt-4 border-t-2 ${isSelected ? 'border-emerald-300' : 'border-slate-100'} flex items-center justify-between px-1`}>
                    <span className="text-[13px] font-black text-slate-600 uppercase tracking-widest">Estimasi {n} siswa</span>
                    <span className={`text-[17px] font-black ${isSelected ? "text-slate-900" : "text-slate-900"}`}>
                      Rp {total.toLocaleString("id-ID")}
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
                className={`h-2.5 rounded-full border-2 border-slate-900 transition-all duration-300 ${i === activeIdx ? 'w-8 bg-emerald-400' : 'w-2.5 bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        {draft && (
          <div className="mt-8 border-t-4 border-slate-900 pt-8">
            {saveError ? <p className="text-[14px] font-bold text-red-500 mb-4">{saveError}</p> : null}
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={saving || !selectedPackageId}
              className="w-full px-6 py-4 bg-indigo-400 text-slate-900 border-4 border-slate-900 rounded-2xl text-[18px] font-black uppercase tracking-widest shadow-[6px_6px_0_0_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_#0f172a] disabled:opacity-50 transition-all"
            >
              {saving ? "Menyimpan..." : afterSaveRedirect ? "Simpan Data ke Database" : "Simpan dan Lihat Album"}
            </button>
            <p className="text-[13px] font-bold text-slate-500 mt-4 text-center">Pilih paket di atas lalu klik simpan.</p>
          </div>
        )}

        {leadId && !draft && (
          <p className="mt-8 text-[13px] font-bold text-slate-500 text-center">
            Lead ID: <span className="text-slate-900 font-mono px-2 py-1 bg-slate-100 rounded border-2 border-slate-300">{leadId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
