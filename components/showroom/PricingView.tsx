"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Book, Sparkles } from "lucide-react";
import DashboardTitle from "@/components/dashboard/DashboardTitle";

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
  image_remove_bg: "Image Editor - Remove BG",
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
    fetch("/api/pricing")
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
    return n * selectedPkg.pricePerStudent;
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
      const res = await fetch("/api/albums", {
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
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href={leadId ? backHrefSaved : backHrefNoDraft}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-app mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <DashboardTitle
          title="Estimator — Harga Paket"
          subtitle={leadId ? "Data sudah tersimpan. Lihat harga paket di bawah." : "Pilih paket dan simpan data ke database."}
        />

        {draft && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <p className="text-sm font-medium text-app">Ringkasan data</p>
            <p className="text-xs text-muted">
              {draft.school_name} · {draft.province_name ?? ""} · {draft.school_city} · {draft.pic_name} · {draft.wa_e164}
              {draft.students_count != null ? ` · ${draft.students_count} siswa` : ""}
            </p>
          </div>
        )}

        <div className="mt-6">
          <p className="text-sm font-medium text-app mb-3">Pilih paket</p>
          <div className="space-y-3">
            {packages.map((pkg) => {
              const n = Math.max(pkg.minStudents, studentsCount || pkg.minStudents);
              const total = n * pkg.pricePerStudent;
              const isSelected = selectedPackageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(isSelected ? null : pkg.id)}
                  className={`relative w-full text-left rounded-2xl border p-5 transition-all duration-200 ${isSelected
                    ? "border-lime-500 bg-lime-500/10 shadow-lg shadow-lime-500/10 scale-[1.01]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                >
                  {pkg.is_popular && !isSelected && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-black uppercase tracking-wide">
                      Popular
                    </span>
                  )}

                  {/* Header: checkbox + name + price */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-lime-500 bg-lime-500 text-white" : "border-white/30"}`}>
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <div>
                        <span className="font-semibold text-app text-[15px]">{pkg.name}</span>
                        <p className="text-[11px] text-muted mt-0.5">min. {pkg.minStudents} siswa</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-app leading-tight">
                        Rp {pkg.pricePerStudent.toLocaleString("id-ID")}
                      </p>
                      <p className="text-[11px] text-muted">/siswa</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-3 border-t border-white/[0.06]" />

                  {/* Features list */}
                  <ul className="space-y-1.5 ml-0.5">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted">
                        <Check className="w-3 h-3 text-lime-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Flipbook & AI Labs badges */}
                  {(pkg.flipbook_enabled || pkg.ai_labs_features.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pkg.flipbook_enabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-400 text-[11px] font-medium border border-lime-500/20">
                          <Book className="w-3 h-3" /> Flipbook
                        </span>
                      )}
                      {pkg.ai_labs_features.map((slug) => (
                        <span key={slug} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[11px] font-medium border border-purple-500/20">
                          <Sparkles className="w-2.5 h-2.5" /> {AI_FEATURE_LABELS[slug] ?? slug}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Estimasi total */}
                  <div className={`mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between`}>
                    <span className="text-[11px] text-muted">Estimasi {n} siswa</span>
                    <span className={`text-sm font-bold ${isSelected ? "text-lime-400" : "text-app"}`}>
                      Rp {total.toLocaleString("id-ID")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {draft && (
          <div className="mt-6">
            {saveError ? <p className="text-sm text-red-400 mb-2">{saveError}</p> : null}
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={saving || !selectedPackageId}
              className="w-full px-4 py-3 bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : afterSaveRedirect ? "Simpan data ke database" : "Simpan dan lihat album"}
            </button>
            <p className="text-xs text-muted mt-2">Pilih paket di atas lalu klik simpan.</p>
          </div>
        )}

        {leadId && !draft && (
          <p className="mt-4 text-xs text-muted">
            Lead ID: <span className="text-app font-mono">{leadId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
