"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useLanguage } from "@/components/providers";

// Lazy-load deck.gl to avoid SSR issues and reduce initial bundle
import dynamic from "next/dynamic";

const DeckGLMap = dynamic(() => import("./egypt-map-gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-card/30 rounded-xl">
      <div className="text-xs text-muted-foreground animate-pulse">Loading map...</div>
    </div>
  ),
});

// ── Governorate capital centroids (lat/lng) — geographic constants ──
export const GOVERNORATE_CENTROIDS: Record<string, [number, number]> = {
  cairo: [31.2357, 30.0444],
  giza: [31.2089, 30.0131],
  alexandria: [29.9187, 31.2001],
  qalyubia: [31.2422, 30.3290],
  dakahlia: [31.3816, 31.0409],
  sharqia: [31.5020, 30.5616],
  gharbia: [31.0130, 30.8754],
  monufia: [30.9791, 30.5972],
  beheira: [30.4086, 31.0341],
  kafr_el_sheikh: [30.9406, 31.1107],
  damietta: [31.8152, 31.4175],
  port_said: [32.3019, 31.2653],
  ismailia: [32.2654, 30.6043],
  suez: [32.5498, 29.9668],
  north_sinai: [33.6175, 31.0688],
  south_sinai: [33.9179, 28.2358],
  red_sea: [33.7998, 27.1783],
  beni_suef: [31.0899, 29.0661],
  fayoum: [30.8418, 29.3084],
  minya: [30.7441, 28.1099],
  asyut: [31.1837, 27.1809],
  sohag: [31.6948, 26.5569],
  qena: [32.7176, 26.1551],
  luxor: [32.6421, 25.6872],
  aswan: [32.8998, 24.0889],
  new_valley: [28.9672, 25.4515],
  matrouh: [27.2453, 31.3525],
};

const INDICATOR_LABELS: Record<string, { en: string; ar: string }> = {
  population: { en: "Population", ar: "السكان" },
  area_km2: { en: "Area (km²)", ar: "المساحة" },
  density_per_km2: { en: "Density", ar: "الكثافة" },
  hdi: { en: "HDI", ar: "مؤشر التنمية" },
  gdp: { en: "GDP", ar: "الناتج المحلي" },
  literacy_rate: { en: "Literacy", ar: "معدل القراءة" },
  poverty_rate: { en: "Poverty", ar: "معدل الفقر" },
};

interface EgyptMapProps {
  size?: "mini" | "full";
  interactive?: boolean;
  showLayerSwitcher?: boolean;
  showTimeSlider?: boolean;
  className?: string;
}

export function EgyptMap({
  size = "full",
  interactive = true,
  showLayerSwitcher = true,
  showTimeSlider = true,
  className,
}: EgyptMapProps) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [activeIndicator, setActiveIndicator] = useState("population");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [hoveredGov, setHoveredGov] = useState<string | null>(null);

  const mapData = useQuery(api.government.getGovernorateMapData, {
    indicator: activeIndicator,
    year: selectedYear ?? undefined,
  });

  // Build column data for deck.gl
  const columnData = useMemo(() => {
    if (!mapData) return [];
    return mapData.governorates
      .filter((g) => {
        const centroid = GOVERNORATE_CENTROIDS[g.geoJsonId];
        return centroid && (g.value != null || g.population != null);
      })
      .map((g) => {
        const centroid = GOVERNORATE_CENTROIDS[g.geoJsonId]!;
        const val = g.value ?? g.population ?? 0;
        return {
          position: centroid,
          value: val,
          nameEn: g.nameEn,
          nameAr: g.nameAr,
          geoJsonId: g.geoJsonId,
          year: g.year,
          unit: g.unit,
        };
      });
  }, [mapData]);

  const maxValue = useMemo(
    () => Math.max(...columnData.map((d) => d.value), 1),
    [columnData]
  );

  const availableIndicators = useMemo(() => {
    if (!mapData) return ["population"];
    return mapData.indicators.length > 0 ? mapData.indicators : ["population"];
  }, [mapData]);

  const availableYears = useMemo(() => mapData?.years ?? [], [mapData]);

  const handleHover = useCallback((id: string | null) => {
    if (interactive) setHoveredGov(id);
  }, [interactive]);

  const isMini = size === "mini";

  // Tooltip data
  const tooltipData = useMemo(() => {
    if (!hoveredGov) return null;
    const d = columnData.find((c) => c.geoJsonId === hoveredGov);
    if (!d) return null;
    return d;
  }, [hoveredGov, columnData]);

  return (
    <div className={`relative flex flex-col ${className ?? ""}`}>
      {/* Layer switcher tabs */}
      {showLayerSwitcher && !isMini && availableIndicators.length > 1 && (
        <div className="flex items-center gap-1 px-3 pt-3 pb-1 overflow-x-auto">
          {availableIndicators.map((ind) => {
            const label = INDICATOR_LABELS[ind];
            return (
              <button
                key={ind}
                onClick={() => {
                  setActiveIndicator(ind);
                  setSelectedYear(null);
                }}
                className={`text-[0.65rem] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeIndicator === ind
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label ? (isAr ? label.ar : label.en) : ind}
              </button>
            );
          })}
        </div>
      )}

      {/* Map canvas */}
      <div className={`relative flex-1 ${isMini ? "min-h-0" : "min-h-[350px]"}`}>
        {columnData.length > 0 ? (
          <DeckGLMap
            data={columnData}
            maxValue={maxValue}
            onHover={handleHover}
            interactive={interactive}
            isMini={isMini}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-xs text-muted-foreground animate-pulse">
              {isAr ? "جارٍ التحميل..." : "Loading map data..."}
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {tooltipData && !isMini && (
          <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 pointer-events-none z-10">
            <p className="text-sm font-bold">{isAr ? tooltipData.nameAr : tooltipData.nameEn}</p>
            <p className="text-xs text-muted-foreground font-mono tabular-nums" dir="ltr">
              {tooltipData.value.toLocaleString()}
              {tooltipData.unit ? ` ${tooltipData.unit}` : ""}
            </p>
            {tooltipData.year && (
              <p className="text-[0.6rem] text-muted-foreground/60">{tooltipData.year}</p>
            )}
          </div>
        )}
      </div>

      {/* Time slider */}
      {showTimeSlider && !isMini && availableYears.length > 1 && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] text-muted-foreground font-mono tabular-nums w-8">
              {availableYears[0]}
            </span>
            <input
              type="range"
              min={0}
              max={availableYears.length - 1}
              value={selectedYear ? availableYears.indexOf(selectedYear) : availableYears.length - 1}
              onChange={(e) => setSelectedYear(availableYears[Number(e.target.value)])}
              className="flex-1 h-1 appearance-none bg-border rounded-full cursor-pointer accent-primary"
            />
            <span className="text-[0.6rem] text-muted-foreground font-mono tabular-nums w-8 text-end">
              {availableYears[availableYears.length - 1]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
