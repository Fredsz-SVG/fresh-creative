"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { apiUrl } from '../../lib/api-url'
import { fetchWithAuth } from '../../lib/api-client'

type Province = { id: string; name: string };
type City = { id: string; province_id: string; name: string; kind: "kota" | "kabupaten" };

const stripPrefix = (s: string) => (s ?? "").trim().replace(/^(kota|kabupaten)\s+/i, "").trim();
const norm = (s: string) => (s ?? "").trim().toLowerCase();

export type ShowroomFormProps = {
  /** Link "Kembali" (mis. /user/album atau /admin/albums) */
  backHref: string;
  /** Path setelah submit (mis. /user/pricing atau /admin/showroom/pricing) */
  pricingPath: string;
  /** Key sessionStorage untuk draft (mis. showroom_draft) */
  draftKey: string;
  /** Source untuk API leads (showroom | admin) */
  source: "showroom" | "admin";
};

export default function ShowroomForm({ backHref, pricingPath, draftKey, source }: ShowroomFormProps) {
  const router = useRouter();

  const [school_name, setSchoolName] = useState("");
  const [pic_name, setPicName] = useState("");

  const [provinceId, setProvinceId] = useState<string>("");
  const [provinceText, setProvinceText] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [showProvDrop, setShowProvDrop] = useState(false);
  const provBoxRef = useRef<HTMLDivElement>(null);

  const [cityId, setCityId] = useState<string>("");
  const [cityText, setCityText] = useState("");
  const [cityName, setCityName] = useState<string>("");
  const [cityKind, setCityKind] = useState<City["kind"] | "">("");
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCity, setLoadingCity] = useState(false);
  const [showCityDrop, setShowCityDrop] = useState(false);
  const cityBoxRef = useRef<HTMLDivElement>(null);

  const [countryCode, setCountryCode] = useState("+62");
  const [waLocal, setWaLocal] = useState("");

  const [studentsCountText, setStudentsCountText] = useState("");
  const students_count = useMemo(() => {
    const t = studentsCountText.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }, [studentsCountText]);

  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // School name validation
  const SCHOOL_NAME_REGEX = /^(SMAN|SMKN|SMK|SMA|MAN|MA|SMPN|SMP|MTsN|MTs|SDN|SD|MIN|MI)\s+\d+\s+.{2,}$/i;
  const schoolNameValid = useMemo(() => {
    const t = school_name.trim();
    if (!t) return true; // don't show error when empty
    return SCHOOL_NAME_REGEX.test(t);
  }, [school_name]);

  // Duplicate school name check
  const [dupCheck, setDupCheck] = useState<{ exists: boolean; matched_name?: string; pic_name?: string; wa_e164?: string } | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);
  const dupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkDuplicate = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 5) {
      setDupCheck(null);
      return;
    }
    setCheckingDup(true);
    try {
      const res = await fetchWithAuth(`/api/albums/check-name?name=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setDupCheck(data);
    } catch {
      setDupCheck(null);
    } finally {
      setCheckingDup(false);
    }
  }, []);

  // Debounced duplicate check on school_name change
  useEffect(() => {
    if (dupTimerRef.current) clearTimeout(dupTimerRef.current);
    const trimmed = school_name.trim();
    if (!trimmed || trimmed.length < 5 || !SCHOOL_NAME_REGEX.test(trimmed)) {
      setDupCheck(null);
      return;
    }
    dupTimerRef.current = setTimeout(() => checkDuplicate(trimmed), 500);
    return () => { if (dupTimerRef.current) clearTimeout(dupTimerRef.current); };
  }, [school_name, checkDuplicate]);

  const cityLabel = (c: City) => `${c.kind === "kota" ? "Kota" : "Kabupaten"} ${stripPrefix(c.name)}`;

  const provinceSuggestions = useMemo(() => {
    const q = norm(provinceText);
    if (!q) return provinces.slice(0, 15);
    return provinces.filter((p) => norm(p.name).includes(q)).slice(0, 15);
  }, [provinceText, provinces]);

  const citySuggestions = useMemo(() => {
    const q = norm(cityText);
    if (!q) return cities.slice(0, 15);
    return cities.filter(
      (c) => norm(cityLabel(c)).includes(q) || norm(stripPrefix(c.name)).includes(q)
    ).slice(0, 15);
  }, [cityText, cities]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (provBoxRef.current && !provBoxRef.current.contains(t)) setShowProvDrop(false);
      if (cityBoxRef.current && !cityBoxRef.current.contains(t)) setShowCityDrop(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/select-area?type=provinces");
        const json = await res.json();
        if (!cancelled) setProvinces(json?.data ?? []);
      } catch {
        if (!cancelled) setProvinces([]);
      } finally {
        if (!cancelled) setLoadingProv(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setCityId("");
      setCityText("");
      setCityName("");
      setCityKind("");
      setLoadingCity(false);
      return;
    }
    let cancelled = false;
    setLoadingCity(true);
    setCityId("");
    setCityText("");
    setCityName("");
    setCityKind("");
    fetchWithAuth(`/api/select-area?type=cities&province_id=${encodeURIComponent(provinceId)}&limit=300`)
      .then((res) => res.json())
      .then((json) => { if (!cancelled) setCities(json?.data ?? []); })
      .catch(() => { if (!cancelled) setCities([]); })
      .finally(() => { if (!cancelled) setLoadingCity(false); });
    return () => { cancelled = true; };
  }, [provinceId]);

  const lockProvince = (p: Province) => {
    setError("");
    setProvinceId(p.id);
    setProvinceText(p.name);
    setShowProvDrop(false);
    setCityId("");
    setCityText("");
    setCityName("");
    setCityKind("");
    setCities([]);
  };

  const onProvinceInputChange = (v: string) => {
    setProvinceText(v);
    setShowProvDrop(true);
    if (provinceId) {
      setProvinceId("");
      setCityId("");
      setCityText("");
      setCityName("");
      setCityKind("");
      setCities([]);
    }
  };

  const lockCity = (c: City) => {
    setError("");
    setCityId(c.id);
    setCityKind(c.kind);
    setCityName(stripPrefix(c.name));
    setCityText(cityLabel(c));
    setShowCityDrop(false);
  };

  const onCityInputChange = (v: string) => {
    setCityText(v);
    setShowCityDrop(true);
    if (cityId) {
      setCityId("");
      setCityName("");
      setCityKind("");
    }
  };

  const waPreview = useMemo(() => {
    const cc = countryCode.trim().startsWith("+") ? countryCode.trim() : `+${countryCode.trim()}`;
    return `${cc}${waLocal || "81234567890"}`;
  }, [countryCode, waLocal]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (school_name.trim().length < 5) return setError("Nama project minimal 5 karakter.");
    if (!SCHOOL_NAME_REGEX.test(school_name.trim())) {
      return setError("Sertahakan nama sekolah/lembaga yang valid. Contoh: SMAN 1 Salatiga, SMKN 2 Bandung.");
    }
    if (dupCheck?.exists) {
      const matchedInfo = dupCheck.matched_name ? `"${dupCheck.matched_name}"` : `"${school_name.trim()}"`;
      return setError(`Nama sekolah mirip dengan ${matchedInfo} yang sudah terdaftar. Hubungi ${dupCheck.pic_name || 'PIC'} (${dupCheck.wa_e164 || '-'}) untuk informasi lebih lanjut.`);
    }
    if (!provinceId) return setError("Pilih provinsi.");
    if (!cityId) return setError("Pilih Kab/Kota.");
    if (!pic_name.trim()) return setError("Nama wajib diisi.");

    const cc = countryCode.trim().startsWith("+") ? countryCode.trim() : `+${countryCode.trim()}`;
    const localDigits = waLocal.replace(/\D/g, "");
    const wa_e164 = `${cc}${localDigits}`;

    if (!/^\+\d{8,16}$/.test(wa_e164)) {
      return setError("Nomor WhatsApp harus format E.164. Contoh: +6281234567890");
    }

    const provinceName = provinces.find((p) => p.id === provinceId)?.name ?? null;
    const draft = {
      school_name: school_name.trim(),
      province_id: provinceId,
      province_name: provinceName,
      school_city: cityName,
      kab_kota: cityKind,
      pic_name: pic_name.trim(),
      wa_e164,
      students_count: students_count ?? null,
      source,
    };
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(draftKey, JSON.stringify(draft));
      }
      router.push(pricingPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  };

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="w-full max-w-xl mx-auto">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Isi Form Project</h1>
        <p className="text-slate-600 font-bold mt-1.5">Lengkapi data di bawah untuk melanjutkan ke pilihan paket.</p>


        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="school_name" className="block text-[15px] font-black text-slate-900 mb-2">Nama Project</label>
            <input
              id="school_name"
              name="school_name"
              value={school_name}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Contoh: SMAN 1 Salatiga"
              className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 transition-all ${school_name.trim() && !schoolNameValid
                ? 'border-red-500 shadow-[4px_4px_0_0_#ef4444]'
                : dupCheck?.exists
                  ? 'border-orange-500 shadow-[4px_4px_0_0_#f97316]'
                  : 'border-slate-900 shadow-[4px_4px_0_0_#0f172a]'
                }`}
              autoComplete="organization"
            />
            {school_name.trim() && !schoolNameValid && (
              <p className="text-xs font-bold text-red-500 mt-2">
                Format: SMAN/SMKN/SMA/SMK/MAN/MA/SMPN/SMP/MTsN/MTs/SDN/SD/MIN/MI + nomor + nama kota.
                <br />Contoh: SMAN 1 Salatiga, SMKN 2 Bandung, MAN 1 Jakarta
              </p>
            )}
            {dupCheck?.exists && (
              <div className="mt-3 flex items-start gap-3 bg-orange-100 border-2 border-orange-500 rounded-xl p-4 shadow-[4px_4px_0_0_#f97316]">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] font-bold text-orange-900 leading-relaxed">
                  Nama sekolah mirip dengan <strong>&quot;{dupCheck.matched_name || school_name.trim()}&quot;</strong> yang sudah terdaftar.
                  {dupCheck.pic_name && (
                    <> Hubungi <strong>{dupCheck.pic_name}</strong></>
                  )}
                  {dupCheck.wa_e164 && (
                    <> di <strong>{dupCheck.wa_e164}</strong></>
                  )}
                  {(dupCheck.pic_name || dupCheck.wa_e164) && <> untuk informasi lebih lanjut.</>}
                </p>
              </div>
            )}
            {checkingDup && schoolNameValid && school_name.trim().length >= 5 && (
              <p className="text-xs font-bold text-slate-500 mt-2">Memeriksa nama project...</p>
            )}
          </div>

          <div ref={provBoxRef} className="relative">
            <label htmlFor="province_input" className="block text-[15px] font-black text-slate-900 mb-2">Provinsi</label>
            <input
              id="province_input"
              type="text"
              value={provinceText}
              onChange={(e) => onProvinceInputChange(e.target.value)}
              onFocus={() => setShowProvDrop(true)}
              disabled={loadingProv}
              placeholder={loadingProv ? "Memuat..." : "Ketik nama provinsi, lalu pilih"}
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] disabled:opacity-60 transition-all"
              autoComplete="off"
            />
            {showProvDrop && provinceSuggestions.length > 0 ? (
              <ul className="absolute z-20 mt-2 w-full max-h-56 overflow-auto bg-white border-2 border-slate-900 rounded-xl shadow-[6px_6px_0_0_#0f172a]">
                {provinceSuggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => lockProvince(p)}
                      className="w-full text-left px-4 py-3 text-[14px] font-bold text-slate-800 hover:bg-indigo-100 hover:text-slate-900 transition-colors border-b-2 border-slate-100 last:border-0"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div ref={cityBoxRef} className="relative">
            <label htmlFor="city_input" className="block text-[15px] font-black text-slate-900 mb-2">Kab/Kota</label>
            <input
              id="city_input"
              type="text"
              value={cityText}
              onChange={(e) => onCityInputChange(e.target.value)}
              onFocus={() => provinceId && setShowCityDrop(true)}
              disabled={!provinceId || loadingCity}
              placeholder={
                !provinceId ? "Pilih provinsi dulu" : loadingCity ? "Memuat..." : "Ketik nama kota/kabupaten, lalu pilih"
              }
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] disabled:opacity-60 transition-all"
              autoComplete="off"
            />
            {showCityDrop && provinceId && citySuggestions.length > 0 ? (
              <ul className="absolute z-20 mt-2 w-full max-h-56 overflow-auto bg-white border-2 border-slate-900 rounded-xl shadow-[6px_6px_0_0_#0f172a]">
                {citySuggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => lockCity(c)}
                      className="w-full text-left px-4 py-3 text-[14px] font-bold text-slate-800 hover:bg-indigo-100 hover:text-slate-900 transition-colors border-b-2 border-slate-100 last:border-0"
                    >
                      {cityLabel(c)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <label htmlFor="pic_name" className="block text-[15px] font-black text-slate-900 mb-2">Nama</label>
            <input
              id="pic_name"
              name="pic_name"
              value={pic_name}
              onChange={(e) => setPicName(e.target.value)}
              placeholder="Contoh: Rachel"
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] transition-all"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-[15px] font-black text-slate-900 mb-2">WhatsApp</label>
            <div className="flex gap-3">
              <input
                id="wa_cc"
                name="wa_cc"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 px-4 py-3 bg-slate-100 border-2 border-slate-900 rounded-xl text-slate-900 font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] transition-all"
                inputMode="text"
              />
              <input
                id="wa_local"
                name="wa_local"
                value={waLocal}
                onChange={(e) => setWaLocal(e.target.value.replace(/\D/g, ""))}
                placeholder="812xxxxxxx"
                className="flex-1 px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] transition-all"
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
            <p className="text-[13px] font-bold text-slate-500 mt-2">
              Contoh hasil: <span className="text-slate-900">{waPreview}</span>
            </p>
          </div>

          <div>
            <label htmlFor="students_count" className="block text-[15px] font-black text-slate-900 mb-2">Jumlah Orang</label>
            <input
              id="students_count"
              name="students_count"
              value={studentsCountText}
              onChange={(e) => setStudentsCountText(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Contoh: 350"
              className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl text-slate-900 font-bold placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-300 shadow-[4px_4px_0_0_#0f172a] transition-all"
              inputMode="numeric"
            />
          </div>

          <div className="sr-only" aria-hidden="true">
            <label htmlFor="honeypot">Jangan isi</label>
            <input
              id="honeypot"
              name="honeypot"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 shadow-[4px_4px_0_0_#ef4444]">
              <p className="font-bold text-red-900 text-sm sm:text-base">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitted}
            className="w-full mt-4 px-6 py-4 text-lg font-black rounded-2xl bg-indigo-300 border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
          >
            {submitted ? "Mengirim..." : "Lanjut ke Pricing"}
          </button>
        </form>
      </div>
    </div>
  );
}
