"use client";

import {
  Landmark, // Pyramid/monument
  Church, // Coptic
  Moon, // Islamic crescent
  Palmtree, // Palm tree
  Waves, // Nile
  Star, // Stars
  Scale, // Justice/Balance (Mizan)
  MapPin, // Location
  Building2, // Government
  BookOpen, // Constitution
} from "lucide-react";

/**
 * Decorative background using professional Lucide icons.
 * Large, faded icons scattered across the hero as editorial accents.
 * Each icon is placed at a specific position for balanced composition.
 */
export function EgyptCultureBg({ className }: { className?: string }) {
  const icons = [
    // icon, x%, y%, size, rotation, opacity
    { Icon: Landmark, x: 8, y: 15, size: 80, rotate: -8, opacity: 0.5 },
    { Icon: Moon, x: 85, y: 10, size: 60, rotate: 15, opacity: 0.4 },
    { Icon: Church, x: 88, y: 55, size: 55, rotate: -5, opacity: 0.35 },
    { Icon: Palmtree, x: 5, y: 60, size: 70, rotate: 5, opacity: 0.4 },
    { Icon: Waves, x: 45, y: 75, size: 90, rotate: 0, opacity: 0.3 },
    { Icon: Star, x: 25, y: 8, size: 30, rotate: 12, opacity: 0.25 },
    { Icon: Star, x: 70, y: 5, size: 22, rotate: -10, opacity: 0.2 },
    { Icon: Scale, x: 50, y: 20, size: 45, rotate: 0, opacity: 0.2 },
    { Icon: MapPin, x: 72, y: 65, size: 40, rotate: 0, opacity: 0.25 },
    { Icon: Building2, x: 18, y: 80, size: 50, rotate: -3, opacity: 0.3 },
    { Icon: BookOpen, x: 35, y: 50, size: 35, rotate: 8, opacity: 0.2 },
    { Icon: Star, x: 55, y: 90, size: 25, rotate: 20, opacity: 0.2 },
  ];

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      {icons.map(({ Icon, x, y, size, rotate, opacity }, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
            opacity,
          }}
        >
          <Icon
            size={size}
            strokeWidth={1}
            className="text-primary"
          />
        </div>
      ))}
    </div>
  );
}
