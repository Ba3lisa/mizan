"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";

interface GovernorateData {
  geoJsonId: string | null | undefined;
  nameEn: string;
  nameAr: string;
  population: number | null | undefined;
  [key: string]: unknown;
}

interface EgyptMapSVGProps {
  className?: string;
  governorates?: GovernorateData[];
}

// GADM name → geoJsonId mapping
const GADM_TO_ID: Record<string, string> = {
  AdDaqahliyah: "dakahlia", AlBahralAhmar: "red_sea", AlBuhayrah: "beheira",
  AlFayyum: "fayoum", AlGharbiyah: "gharbia", AlIskandariyah: "alexandria",
  "AlIsma`iliyah": "ismailia", AlJizah: "giza", AlMinufiyah: "monufia",
  AlMinya: "minya", AlQahirah: "cairo", AlQalyubiyah: "qalyubia",
  AlUqsur: "luxor", AlWadialJadid: "new_valley", AsSuways: "suez",
  AshSharqiyah: "sharqia", Aswan: "aswan", Asyut: "asyut",
  BaniSuwayf: "beni_suef", "BurSa`id": "port_said", Dumyat: "damietta",
  "JanubSina'": "south_sinai", KafrashShaykh: "kafr_el_sheikh",
  Matrouh: "matrouh", Qina: "qena", "ShamalSina'": "north_sinai", Suhaj: "sohag",
};

const W = 380;
const H = 460;

export function EgyptMapSVG({ className, governorates }: EgyptMapSVGProps) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/egypt-adm1.json")
      .then((r) => r.json())
      .then((d) => setGeojson(d as FeatureCollection))
      .catch(() => {});
  }, []);

  const govByKey = useMemo(() => {
    const m = new Map<string, GovernorateData>();
    if (governorates) {
      for (const g of governorates) {
        if (g.geoJsonId) m.set(g.geoJsonId, g);
      }
    }
    return m;
  }, [governorates]);

  const maxPop = useMemo(() => {
    if (!governorates?.length) return 1;
    return Math.max(...governorates.map((g) => g.population ?? 0), 1);
  }, [governorates]);

  const paths = useMemo(() => {
    if (!geojson) return [];
    const proj = geoMercator().fitSize([W, H], geojson);
    const pathGen = geoPath().projection(proj);

    return geojson.features.map((f) => {
      const name = (f.properties as { name: string }).name;
      const key = GADM_TO_ID[name] ?? name.toLowerCase();
      const gov = govByKey.get(key);
      const pop = gov?.population ?? null;
      const t = pop !== null ? Math.pow(pop / maxPop, 0.6) : 0;

      return {
        d: pathGen(f) ?? "",
        key,
        nameEn: gov?.nameEn ?? key.replace(/_/g, " "),
        nameAr: gov?.nameAr ?? name,
        population: pop,
        t, // normalized intensity 0-1
      };
    });
  }, [geojson, govByKey, maxPop]);

  const handleEnter = useCallback((key: string) => setHovered(key), []);
  const handleLeave = useCallback(() => setHovered(null), []);

  const hoveredData = useMemo(() => {
    if (!hovered) return null;
    return paths.find((p) => p.key === hovered) ?? null;
  }, [hovered, paths]);

  if (!geojson || paths.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className ?? ""}`}>
        <div className="w-12 h-16 bg-muted/10 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <svg viewBox={`-10 -10 ${W + 20} ${H + 20}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Governorate fills */}
        {paths.map((p) => {
          const isHov = hovered === p.key;
          // Gold choropleth: low pop = subtle, high pop = bright gold
          const fill = p.t > 0
            ? `hsl(43, ${20 + p.t * 40}%, ${18 + p.t * 38}%)`
            : "var(--muted)";

          return (
            <path
              key={p.key}
              d={p.d}
              fill={isHov ? "var(--primary)" : fill}
              fillOpacity={isHov ? 0.7 : 0.85}
              stroke="var(--background)"
              strokeWidth={isHov ? 1.5 : 0.8}
              className="transition-all duration-200"
              onMouseEnter={() => handleEnter(p.key)}
              onMouseLeave={handleLeave}
              style={{ cursor: "pointer" }}
            />
          );
        })}
      </svg>

      {/* Hover info — small, bottom of map */}
      {hoveredData && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border/60 rounded-lg px-3 py-1.5 pointer-events-none flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold truncate">{hoveredData.nameAr}</span>
          <span className="text-[0.65rem] text-muted-foreground truncate">{hoveredData.nameEn}</span>
          {hoveredData.population != null && (
            <span className="text-xs font-mono tabular-nums text-primary font-bold" dir="ltr">
              {(hoveredData.population / 1_000_000).toFixed(1)}M
            </span>
          )}
        </div>
      )}
    </div>
  );
}
