"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
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
};

const DEFAULT_PACKAGES: PricingPackage[] = [
  { id: "basic", name: "Paket Basic", pricePerStudent: 85000, minStudents: 100, features: ["Cover standar", "24 halaman", "Foto kelas + individu", "Soft copy"] },
  { id: "standard", name: "Paket Standard", pricePerStudent: 120000, minStudents: 100, features: ["Cover pilihan", "32 halaman", "Foto kelas + individu + acara", "Soft copy", "Konsultasi 1x"] },
  { id: "premium", name: "Paket Premium", pricePerStudent: 165000, minStudents: 80, features: ["Cover custom", "40 halaman", "Semua foto + layout eksklusif", "Soft copy + hard cover", "Konsultasi 2x", "Dedicated PIC"] },
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
          }));
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
                  className={`w-full text-left rounded-xl border p-4 transition-all ${isSelected
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-lime-500 bg-lime-500 text-white" : "border-white/30"}`}>
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="font-medium text-app">{pkg.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-app">
                        Rp {pkg.pricePerStudent.toLocaleString("id-ID")}/siswa
                      </p>
                      <p className="text-xs text-muted">min. {pkg.minStudents} siswa</p>
                    </div>
                  </div>
                  <ul className="mt-2 ml-7 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {pkg.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <p className="mt-2 ml-7 text-xs text-app">
                    Estimasi total ({n} siswa): <span className="font-semibold">Rp {total.toLocaleString("id-ID")}</span>
                  </p>
                </button>
              );
            })}
          </div>

          {totalPrice != null && selectedPkg && (
            <div className="mt-4 rounded-xl border border-lime-500/50 bg-lime-500/10 p-4">
              <p className="text-sm text-muted">Total estimasi</p>
              <p className="text-xl font-bold text-app">Rp {totalPrice.toLocaleString("id-ID")}</p>
              <p className="text-xs text-muted mt-1">
                {selectedPkg.name} · {Math.max(selectedPkg.minStudents, studentsCount || selectedPkg.minStudents)} siswa
              </p>
            </div>
          )}
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
