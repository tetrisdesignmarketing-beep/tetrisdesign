"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { siteContact } from "@/lib/site-content";
import {
  CONTACT_MAP_DISABLE_DEFAULT_UI,
  CONTACT_MAP_ID,
  CONTACT_MAP_PIN,
  CONTACT_MAP_USE_ADVANCED_MARKER,
  CONTACT_MAP_ZOOM,
} from "@/lib/contact-map-config";
import { cn } from "@/lib/utils";

const MAP_LOAD_TIMEOUT_MS = 8000;

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface ContactMapClientProps {
  onMapReady?: (map: google.maps.Map) => void;
  onError?: () => void;
  className?: string;
}

function openInfoWindow(
  map: google.maps.Map,
  anchor: google.maps.Marker | google.maps.marker.AdvancedMarkerElement,
) {
  const infoWindow = new google.maps.InfoWindow({
    content: "Tetris",
    disableAutoPan: true,
  });
  infoWindow.open({ map, anchor });
}

async function addClassicMarker(map: google.maps.Map) {
  const marker = new google.maps.Marker({
    map,
    position: siteContact.mapsCenter,
    title: "Tetris",
    icon: {
      url: CONTACT_MAP_PIN.src,
      scaledSize: new google.maps.Size(CONTACT_MAP_PIN.width, CONTACT_MAP_PIN.height),
      anchor: new google.maps.Point(
        CONTACT_MAP_PIN.width / 2,
        CONTACT_MAP_PIN.height,
      ),
    },
  });
  openInfoWindow(map, marker);
}

async function addAdvancedMarker(map: google.maps.Map) {
  const { AdvancedMarkerElement } = await importLibrary("marker");

  const pin = document.createElement("img");
  pin.src = CONTACT_MAP_PIN.src;
  pin.width = CONTACT_MAP_PIN.width;
  pin.height = CONTACT_MAP_PIN.height;
  pin.alt = "";
  pin.draggable = false;

  const marker = new AdvancedMarkerElement({
    map,
    position: siteContact.mapsCenter,
    content: pin,
    title: "Tetris",
  });
  openInfoWindow(map, marker);
}

function waitForTiles(map: google.maps.Map, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Map tiles timeout"));
      }
    }, timeoutMs);

    map.addListener("tilesloaded", () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve();
      }
    });
  });
}

export function ContactMapClient({ onMapReady, onError, className }: ContactMapClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onErrorRef = useRef(onError);

  /* Giữ callback mới nhất cho effect/timer — gán sau commit, không gán trong render. */
  useLayoutEffect(() => {
    onMapReadyRef.current = onMapReady;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const container = containerRef.current;
    if (!apiKey || !container) return;

    let map: google.maps.Map | null = null;
    let cancelled = false;
    let authFailed = false;

    setOptions({
      key: apiKey,
      v: "weekly",
      region: "VN",
    });

    const reportError = () => {
      if (!cancelled) onErrorRef.current?.();
    };

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      authFailed = true;
    };

    const initMap = async (useMapId: boolean) => {
      authFailed = false;
      const { Map } = await importLibrary("maps");

      const mapOptions: google.maps.MapOptions = {
        center: siteContact.mapsCenter,
        zoom: CONTACT_MAP_ZOOM.default,
        disableDefaultUI: CONTACT_MAP_DISABLE_DEFAULT_UI,
        gestureHandling: "cooperative",
      };

      if (useMapId && CONTACT_MAP_ID) {
        mapOptions.mapId = CONTACT_MAP_ID;
      }

      const instance = new Map(container, mapOptions);

      try {
        await waitForTiles(instance, MAP_LOAD_TIMEOUT_MS);
      } catch {
        google.maps.event.clearInstanceListeners(instance);
        throw new Error("Map tiles failed");
      }

      if (authFailed) {
        google.maps.event.clearInstanceListeners(instance);
        throw new Error("Map auth failed");
      }

      if (useMapId && CONTACT_MAP_USE_ADVANCED_MARKER) {
        await addAdvancedMarker(instance);
      } else {
        await addClassicMarker(instance);
      }

      return instance;
    };

    void (async () => {
      try {
        if (CONTACT_MAP_USE_ADVANCED_MARKER) {
          try {
            map = await initMap(true);
          } catch (firstError) {
            console.warn("[ContactMap] Map ID load failed, retrying without mapId:", firstError);
            map = await initMap(false);
          }
        } else {
          map = await initMap(false);
        }

        if (!cancelled) onMapReadyRef.current?.(map);
      } catch (error) {
        console.error(
          "[ContactMap] Google Maps failed. Kiểm tra GCP:\n" +
            "1. Google Maps Platform → Finish account setup (popup India trước đó phải Set up, không Skip)\n" +
            "2. APIs & Services → Library → Maps JavaScript API = Enabled\n" +
            "3. APIs & Services → Page usage agreements → Accept\n" +
            "4. Billing gắn project tetrisdesign-maps",
          error,
        );
        reportError();
      }
    })();

    return () => {
      cancelled = true;
      window.gm_authFailure = previousAuthFailure;
      if (map) {
        google.maps.event.clearInstanceListeners(map);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-label="Bản đồ vị trí Tetris Design"
    />
  );
}
