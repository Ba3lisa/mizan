"use client";

import { useMemo, useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { ColumnLayer, GeoJsonLayer } from "@deck.gl/layers";
import { luma } from "@luma.gl/core";
import { webgl2Adapter } from "@luma.gl/webgl";

// Register WebGL adapter so deck.gl doesn't try WebGPU
luma.registerAdapters([webgl2Adapter]);

// Egypt bounding box for the view
const EGYPT_VIEW = {
  longitude: 30.8,
  latitude: 26.5,
  zoom: 5.2,
  pitch: 45,
  bearing: -10,
  minZoom: 4,
  maxZoom: 8,
};

const EGYPT_VIEW_MINI = {
  longitude: 30.8,
  latitude: 27.0,
  zoom: 4.5,
  pitch: 40,
  bearing: -5,
  minZoom: 4.5,
  maxZoom: 4.5,
};

// Simple Egypt outline as GeoJSON (simplified border)
const EGYPT_OUTLINE = {
  type: "Feature" as const,
  geometry: {
    type: "Polygon" as const,
    coordinates: [[
      [25.0, 31.5], [29.0, 31.5], [30.5, 31.5], [32.0, 31.3],
      [33.2, 31.1], [34.2, 31.3], [34.9, 29.5], [34.4, 28.0],
      [33.5, 27.6], [33.9, 26.6], [35.8, 23.9], [35.6, 22.0],
      [31.4, 22.0], [25.0, 22.0], [25.0, 25.5], [25.0, 29.0],
      [25.0, 31.5],
    ]],
  },
  properties: {},
};

interface ColumnDatum {
  position: [number, number];
  value: number;
  nameEn: string;
  nameAr: string;
  geoJsonId: string;
  year: string | null;
  unit: string | null;
}

interface EgyptMapGLProps {
  data: ColumnDatum[];
  maxValue: number;
  onHover: (geoJsonId: string | null) => void;
  interactive: boolean;
  isMini: boolean;
}

// Gold color ramp from the Mizan palette
function getColor(value: number, maxValue: number): [number, number, number, number] {
  const t = Math.pow(value / maxValue, 0.5); // square root scale for better distribution
  const r = Math.floor(120 + t * 81);
  const g = Math.floor(90 + t * 78);
  const b = Math.floor(30 + t * 46);
  const a = Math.floor(180 + t * 75);
  return [r, g, b, a];
}

export default function EgyptMapGL({
  data,
  maxValue,
  onHover,
  interactive,
  isMini,
}: EgyptMapGLProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Defer rendering to avoid SSR/hydration issues with WebGL
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        setReady(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  const initialViewState = isMini ? EGYPT_VIEW_MINI : EGYPT_VIEW;

  const layers = useMemo(() => {
    if (!ready) return [];

    const outline = new GeoJsonLayer({
      id: "egypt-outline",
      data: EGYPT_OUTLINE,
      filled: true,
      stroked: true,
      getFillColor: [30, 35, 48, 60],
      getLineColor: [37, 42, 54, 180],
      getLineWidth: 1,
      lineWidthUnits: "pixels" as const,
    });

    const maxElevation = isMini ? 80000 : 120000;

    const columns = new ColumnLayer<ColumnDatum>({
      id: "gov-columns",
      data,
      diskResolution: 12,
      radius: isMini ? 12000 : 15000,
      elevationScale: 1,
      getPosition: (d) => d.position,
      getFillColor: (d) => getColor(d.value, maxValue),
      getElevation: (d) => (d.value / maxValue) * maxElevation,
      pickable: interactive,
      autoHighlight: interactive,
      highlightColor: [201, 168, 76, 220],
      onHover: (info) => {
        onHover(info.object?.geoJsonId ?? null);
      },
      transitions: {
        getElevation: { duration: 800, type: "spring" },
        getFillColor: { duration: 600 },
      },
    });

    return [outline, columns];
  }, [ready, data, maxValue, onHover, interactive, isMini]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        WebGL not available
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-xs text-muted-foreground animate-pulse">Loading map...</div>
      </div>
    );
  }

  return (
    <DeckGL
      initialViewState={initialViewState}
      controller={interactive ? { dragRotate: true, touchRotate: true } : false}
      layers={layers}
      style={{ width: "100%", height: "100%" }}
      getCursor={() => interactive ? "grab" : "default"}
      useDevicePixels={false}
    />
  );
}
