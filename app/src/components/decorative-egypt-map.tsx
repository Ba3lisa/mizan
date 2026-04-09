"use client";

import { useEffect, useState, useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";

/**
 * Purely decorative Egypt map silhouette.
 * Renders governorate boundaries from real GeoJSON data.
 * No interactivity, no data, no tooltips — just a subtle background shape.
 */
export function DecorativeEgyptMap({ className }: { className?: string }) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/egypt-adm1.json")
      .then((r) => r.json())
      .then((d) => setGeojson(d as FeatureCollection))
      .catch(() => {});
  }, []);

  const paths = useMemo(() => {
    if (!geojson) return [];
    const proj = geoMercator().fitSize([380, 460], geojson);
    const pathGen = geoPath().projection(proj);
    return geojson.features.map((f, i) => ({
      d: pathGen(f) ?? "",
      key: i,
    }));
  }, [geojson]);

  if (paths.length === 0) return null;

  return (
    <svg
      viewBox="0 0 380 460"
      className={`w-full h-full ${className ?? ""}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Fills */}
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="var(--primary)"
          fillOpacity={0.5}
          stroke="var(--primary)"
          strokeWidth={1}
          strokeOpacity={0.4}
        />
      ))}
      {/* Borders on top for crisp edges */}
      {paths.map((p) => (
        <path
          key={`b-${p.key}`}
          d={p.d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={0.6}
          strokeOpacity={0.8}
        />
      ))}
    </svg>
  );
}
