/** MIT — adapted from Codrops Infinite Canvas (https://tympanus.net/Tutorials/InfiniteCanvas/) */
"use client";

import { KeyboardControls, Stats, useKeyboardControls, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { clamp, lerp } from "./math";
import { useIsTouchDevice } from "./use-is-touch-device";
import {
  CHUNK_FADE_MARGIN,
  CHUNK_OFFSETS,
  CHUNK_SIZE,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  INITIAL_CAMERA_Z,
  INVIS_THRESHOLD,
  KEYBOARD_SPEED,
  MAX_VELOCITY,
  RENDER_DISTANCE,
  SELECT_SLOP_PX,
  VELOCITY_DECAY,
  VELOCITY_LERP,
} from "./constants";
import { getTexture, unwatchTexture } from "./texture-manager";
import type { ChunkData, InfiniteCanvasProps, MediaItem, PlaneData } from "./types";
import { generateChunkPlanesCached, getChunkUpdateThrottleMs, shouldThrottleUpdate } from "./utils";

const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

const KEYBOARD_MAP = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "up", keys: ["e", "E"] },
  { name: "down", keys: ["q", "Q"] },
];

type KeyboardKeys = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

const getTouchDistance = (touches: Touch[]) => {
  if (touches.length < 2) {
    return 0;
  }

  const [t1, t2] = touches;
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

type CameraGridState = {
  cx: number;
  cy: number;
  cz: number;
  camZ: number;
};

function isLightboxOpen() {
  return document.documentElement.hasAttribute("data-lightbox-open");
}

function MediaPlane({
  position,
  scale,
  media,
  mediaIndex,
  chunkCx,
  chunkCy,
  chunkCz,
  cameraGridRef,
  onHoverChange,
}: {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  media: MediaItem;
  mediaIndex: number;
  chunkCx: number;
  chunkCy: number;
  chunkCz: number;
  cameraGridRef: React.RefObject<CameraGridState>;
  onHoverChange?: (index: number | null) => void;
}) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const localState = React.useRef({ opacity: 0, frame: 0, ready: false });

  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  useFrame(() => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    const state = localState.current;

    if (!material || !mesh) {
      return;
    }

    state.frame = (state.frame + 1) & 1;

    if (state.opacity < INVIS_THRESHOLD && !mesh.visible && state.frame === 0) {
      return;
    }

    const cam = cameraGridRef.current;
    const dist = Math.max(Math.abs(chunkCx - cam.cx), Math.abs(chunkCy - cam.cy), Math.abs(chunkCz - cam.cz));
    const absDepth = Math.abs(position.z - cam.camZ);

    if (absDepth > DEPTH_FADE_END + 50) {
      state.opacity = 0;
      material.opacity = 0;
      material.depthWrite = false;
      mesh.visible = false;
      return;
    }

    const gridFade =
      dist <= RENDER_DISTANCE ? 1 : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001));

    const depthFade =
      absDepth <= DEPTH_FADE_START
        ? 1
        : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001));

    const target = Math.min(gridFade, depthFade * depthFade);

    state.opacity = target < INVIS_THRESHOLD && state.opacity < INVIS_THRESHOLD ? 0 : lerp(state.opacity, target, 0.18);

    const isFullyOpaque = state.opacity > 0.99;
    material.opacity = isFullyOpaque ? 1 : state.opacity;
    material.depthWrite = isFullyOpaque;
    mesh.visible = state.opacity > INVIS_THRESHOLD;
  });

  // Calculate display scale from media dimensions (from manifest)
  const displayScale = React.useMemo(() => {
    if (media.width && media.height) {
      const aspect = media.width / media.height;
      return new THREE.Vector3(scale.y * aspect, scale.y, 1);
    }

    return scale;
  }, [media.width, media.height, scale]);

  const mediaUrl = media.url;
  const mediaWidth = media.width;
  const mediaHeight = media.height;

  // Fade in on preview only. Full-res swap mutates the same texture — do not reset opacity.
  React.useEffect(() => {
    let canceled = false;
    const state = localState.current;
    state.ready = false;
    state.opacity = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset trạng thái fade khi đổi texture (đồng bộ với three.js)
    setIsReady(false);

    const material = materialRef.current;

    if (material) {
      material.opacity = 0;
      material.depthWrite = false;
      material.map = null;
    }

    const onPreview = () => {
      if (canceled) return;
      state.ready = true;
      setIsReady(true);
    };

    const tex = getTexture(
      { url: mediaUrl, width: mediaWidth, height: mediaHeight },
      onPreview,
    );
    setTexture(tex);

    return () => {
      canceled = true;
      unwatchTexture(mediaUrl, onPreview);
    };
  }, [mediaHeight, mediaUrl, mediaWidth]);

  // Apply texture when ready
  React.useEffect(() => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    const state = localState.current;

    if (!material || !mesh || !texture || !isReady || !state.ready) {
      return;
    }

    material.map = texture;
    material.opacity = state.opacity;
    material.depthWrite = state.opacity >= 1;
    mesh.scale.copy(displayScale);
  }, [displayScale, texture, isReady]);

  if (!texture || !isReady) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={displayScale}
      visible={false}
      geometry={PLANE_GEOMETRY}
      userData={{ mediaIndex }}
      onPointerOver={
        onHoverChange
          ? (event) => {
              event.stopPropagation();
              onHoverChange(mediaIndex);
            }
          : undefined
      }
      onPointerOut={onHoverChange ? () => onHoverChange(null) : undefined}
    >
      <meshBasicMaterial ref={materialRef} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Chunk({
  cx,
  cy,
  cz,
  media,
  cameraGridRef,
  onHoverChange,
}: {
  cx: number;
  cy: number;
  cz: number;
  media: MediaItem[];
  cameraGridRef: React.RefObject<CameraGridState>;
  onHoverChange?: (index: number | null) => void;
}) {
  const [planes, setPlanes] = React.useState<PlaneData[] | null>(null);

  React.useEffect(() => {
    let canceled = false;
    const run = () => !canceled && setPlanes(generateChunkPlanesCached(cx, cy, cz));

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(run, { timeout: 100 });

      return () => {
        canceled = true;
        cancelIdleCallback(id);
      };
    }

    const id = setTimeout(run, 0);
    return () => {
      canceled = true;
      clearTimeout(id);
    };
  }, [cx, cy, cz]);

  if (!planes) {
    return null;
  }

  return (
    <group>
      {planes.map((plane) => {
        const mediaIndex = plane.mediaIndex % media.length;
        const mediaItem = media[mediaIndex];

        if (!mediaItem) {
          return null;
        }

        return (
          <MediaPlane
            key={plane.id}
            position={plane.position}
            scale={plane.scale}
            media={mediaItem}
            mediaIndex={mediaIndex}
            chunkCx={cx}
            chunkCy={cy}
            chunkCz={cz}
            cameraGridRef={cameraGridRef}
            onHoverChange={onHoverChange}
          />
        );
      })}
    </group>
  );
}

type ControllerState = {
  velocity: { x: number; y: number; z: number };
  targetVel: { x: number; y: number; z: number };
  basePos: { x: number; y: number; z: number };
  drift: { x: number; y: number };
  mouse: { x: number; y: number };
  lastMouse: { x: number; y: number };
  scrollAccum: number;
  isDragging: boolean;
  lastTouches: Touch[];
  lastTouchDist: number;
  lastChunkKey: string;
  lastChunkUpdate: number;
  pendingChunk: { cx: number; cy: number; cz: number } | null;
};

const createInitialState = (camZ: number): ControllerState => ({
  velocity: { x: 0, y: 0, z: 0 },
  targetVel: { x: 0, y: 0, z: 0 },
  basePos: { x: 0, y: 0, z: camZ },
  drift: { x: 0, y: 0 },
  mouse: { x: 0, y: 0 },
  lastMouse: { x: 0, y: 0 },
  scrollAccum: 0,
  isDragging: false,
  lastTouches: [],
  lastTouchDist: 0,
  lastChunkKey: "",
  lastChunkUpdate: 0,
  pendingChunk: null,
});

function SceneController({
  media,
  onMediaSelect,
  onTextureProgress,
}: {
  media: MediaItem[];
  onMediaSelect?: (index: number) => void;
  onTextureProgress?: (progress: number) => void;
}) {
  const { camera, gl, scene } = useThree();
  const isTouchDevice = useIsTouchDevice();
  const [, getKeys] = useKeyboardControls<keyof KeyboardKeys>();

  const state = React.useRef<ControllerState>(createInitialState(INITIAL_CAMERA_Z));
  const cameraGridRef = React.useRef<CameraGridState>({ cx: 0, cy: 0, cz: 0, camZ: camera.position.z });
  const hoverIndexRef = React.useRef<number | null>(null);
  const pointerStartRef = React.useRef<{ x: number; y: number; index: number | null } | null>(null);
  const pointerMovedRef = React.useRef(false);
  const onMediaSelectRef = React.useRef(onMediaSelect);
  /* Raycaster/vector tái sử dụng (đối tượng three.js bị mutate) → giữ trong ref. */
  const raycasterRef = React.useRef<THREE.Raycaster | null>(null);
  const ndcRef = React.useRef<THREE.Vector2 | null>(null);
  const hitMediaIndexRef = React.useRef<(x: number, y: number) => number | null>(() => null);
  /* Giữ callback/giá trị mới nhất cho handler — gán sau commit, không gán trong render. */
  React.useLayoutEffect(() => {
    onMediaSelectRef.current = onMediaSelect;
    hitMediaIndexRef.current = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const raycaster = (raycasterRef.current ??= new THREE.Raycaster());
      const ndc = (ndcRef.current ??= new THREE.Vector2());
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        if (!hit.object.visible) continue;
        const idx = hit.object.userData.mediaIndex;
        if (typeof idx === "number") return idx;
      }
      return null;
    };
  });

  const [chunks, setChunks] = React.useState<ChunkData[]>([]);

  const { progress } = useProgress();
  const maxProgress = React.useRef(0);

  const setWrapperCursor = React.useCallback(
    (mode: "grab" | "grabbing" | "eye") => {
      const root = gl.domElement.closest(".infinite-canvas");
      if (root instanceof HTMLElement) {
        root.dataset.cursor = mode;
      }
    },
    [gl],
  );

  const syncCursor = React.useCallback(() => {
    const s = state.current;
    if (s.isDragging && pointerMovedRef.current) {
      setWrapperCursor("grabbing");
      return;
    }
    if (hoverIndexRef.current != null && onMediaSelectRef.current) {
      setWrapperCursor("eye");
      return;
    }
    setWrapperCursor("grab");
  }, [setWrapperCursor]);

  const onHoverChange = React.useCallback(
    (index: number | null) => {
      hoverIndexRef.current = index;
      syncCursor();
    },
    [syncCursor],
  );

  React.useEffect(() => {
    const rounded = Math.round(progress);

    if (rounded > maxProgress.current) {
      maxProgress.current = rounded;
      onTextureProgress?.(rounded);
    }
  }, [progress, onTextureProgress]);

  React.useEffect(() => {
    const canvas = gl.domElement;
    const s = state.current;
    setWrapperCursor("grab");

    const markMoved = (x: number, y: number) => {
      const start = pointerStartRef.current;
      if (!start || pointerMovedRef.current) return;
      const dx = x - start.x;
      const dy = y - start.y;
      if (dx * dx + dy * dy > SELECT_SLOP_PX * SELECT_SLOP_PX) {
        pointerMovedRef.current = true;
        syncCursor();
      }
    };

    const trySelect = () => {
      const start = pointerStartRef.current;
      const select = onMediaSelectRef.current;
      if (!pointerMovedRef.current && start?.index != null && select) {
        select(start.index);
      }
      pointerStartRef.current = null;
      pointerMovedRef.current = false;
      s.isDragging = false;
      syncCursor();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isLightboxOpen()) return;
      s.isDragging = true;
      s.lastMouse = { x: e.clientX, y: e.clientY };
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        index: hitMediaIndexRef.current(e.clientX, e.clientY) ?? hoverIndexRef.current,
      };
      pointerMovedRef.current = false;
    };

    const onMouseUp = () => {
      if (isLightboxOpen()) {
        s.isDragging = false;
        pointerStartRef.current = null;
        pointerMovedRef.current = false;
        return;
      }
      trySelect();
    };

    const onMouseLeave = () => {
      s.mouse = { x: 0, y: 0 };
      s.isDragging = false;
      hoverIndexRef.current = null;
      pointerStartRef.current = null;
      pointerMovedRef.current = false;
      setWrapperCursor("grab");
    };

    const onMouseMove = (e: MouseEvent) => {
      s.mouse = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };

      if (s.isDragging) {
        markMoved(e.clientX, e.clientY);
        s.targetVel.x -= (e.clientX - s.lastMouse.x) * 0.025;
        s.targetVel.y += (e.clientY - s.lastMouse.y) * 0.025;
        s.lastMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (isLightboxOpen()) return;
      e.preventDefault();
      e.stopPropagation();
      s.scrollAccum += e.deltaY * 0.006;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isLightboxOpen()) return;
      e.preventDefault();
      e.stopPropagation();
      s.lastTouches = Array.from(e.touches) as Touch[];
      s.lastTouchDist = getTouchDistance(s.lastTouches);
      const [touch] = s.lastTouches;
      if (e.touches.length === 1 && touch) {
        s.isDragging = true;
        pointerStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          index: hitMediaIndexRef.current(touch.clientX, touch.clientY) ?? hoverIndexRef.current,
        };
        pointerMovedRef.current = false;
      } else {
        pointerStartRef.current = null;
        pointerMovedRef.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isLightboxOpen()) return;
      e.preventDefault();
      e.stopPropagation();
      const touches = Array.from(e.touches) as Touch[];

      if (touches.length === 1 && s.lastTouches.length >= 1) {
        const [touch] = touches;
        const [last] = s.lastTouches;

        if (touch && last) {
          markMoved(touch.clientX, touch.clientY);
          s.targetVel.x -= (touch.clientX - last.clientX) * 0.02;
          s.targetVel.y += (touch.clientY - last.clientY) * 0.02;
        }
      } else if (touches.length === 2 && s.lastTouchDist > 0) {
        pointerMovedRef.current = true;
        const dist = getTouchDistance(touches);
        s.scrollAccum += (s.lastTouchDist - dist) * 0.006;
        s.lastTouchDist = dist;
      }

      s.lastTouches = touches;
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      s.lastTouches = Array.from(e.touches) as Touch[];
      s.lastTouchDist = getTouchDistance(s.lastTouches);
      if (e.touches.length === 0) {
        trySelect();
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl, setWrapperCursor, syncCursor]);

  useFrame(() => {
    if (isLightboxOpen()) return;

    const s = state.current;
    const now = performance.now();

    const { forward, backward, left, right, up, down } = getKeys();
    if (forward) s.targetVel.z -= KEYBOARD_SPEED;
    if (backward) s.targetVel.z += KEYBOARD_SPEED;
    if (left) s.targetVel.x -= KEYBOARD_SPEED;
    if (right) s.targetVel.x += KEYBOARD_SPEED;
    if (down) s.targetVel.y -= KEYBOARD_SPEED;
    if (up) s.targetVel.y += KEYBOARD_SPEED;

    const isZooming = Math.abs(s.velocity.z) > 0.05;
    const zoomFactor = clamp(s.basePos.z / 50, 0.3, 2.0);
    const driftAmount = 8.0 * zoomFactor;
    const driftLerp = isZooming ? 0.2 : 0.12;

    if (s.isDragging) {
      // Freeze drift during drag - keep it at current value
    } else if (isTouchDevice) {
      s.drift.x = lerp(s.drift.x, 0, driftLerp);
      s.drift.y = lerp(s.drift.y, 0, driftLerp);
    } else {
      s.drift.x = lerp(s.drift.x, s.mouse.x * driftAmount, driftLerp);
      s.drift.y = lerp(s.drift.y, s.mouse.y * driftAmount, driftLerp);
    }

    s.targetVel.z += s.scrollAccum;
    s.scrollAccum *= 0.8;

    s.targetVel.x = clamp(s.targetVel.x, -MAX_VELOCITY, MAX_VELOCITY);
    s.targetVel.y = clamp(s.targetVel.y, -MAX_VELOCITY, MAX_VELOCITY);
    s.targetVel.z = clamp(s.targetVel.z, -MAX_VELOCITY, MAX_VELOCITY);

    s.velocity.x = lerp(s.velocity.x, s.targetVel.x, VELOCITY_LERP);
    s.velocity.y = lerp(s.velocity.y, s.targetVel.y, VELOCITY_LERP);
    s.velocity.z = lerp(s.velocity.z, s.targetVel.z, VELOCITY_LERP);

    s.basePos.x += s.velocity.x;
    s.basePos.y += s.velocity.y;
    s.basePos.z += s.velocity.z;

    camera.position.set(s.basePos.x + s.drift.x, s.basePos.y + s.drift.y, s.basePos.z);

    s.targetVel.x *= VELOCITY_DECAY;
    s.targetVel.y *= VELOCITY_DECAY;
    s.targetVel.z *= VELOCITY_DECAY;

    const cx = Math.floor(s.basePos.x / CHUNK_SIZE);
    const cy = Math.floor(s.basePos.y / CHUNK_SIZE);
    const cz = Math.floor(s.basePos.z / CHUNK_SIZE);

    cameraGridRef.current = { cx, cy, cz, camZ: s.basePos.z };

    const key = `${cx},${cy},${cz}`;
    if (key !== s.lastChunkKey) {
      s.pendingChunk = { cx, cy, cz };
      s.lastChunkKey = key;
    }

    const throttleMs = getChunkUpdateThrottleMs(isZooming, Math.abs(s.velocity.z));

    if (s.pendingChunk && shouldThrottleUpdate(s.lastChunkUpdate, throttleMs, now)) {
      const { cx: ucx, cy: ucy, cz: ucz } = s.pendingChunk;
      s.pendingChunk = null;
      s.lastChunkUpdate = now;

      setChunks(
        CHUNK_OFFSETS.map((o) => ({
          key: `${ucx + o.dx},${ucy + o.dy},${ucz + o.dz}`,
          cx: ucx + o.dx,
          cy: ucy + o.dy,
          cz: ucz + o.dz,
        }))
      );
    }
  });

  React.useEffect(() => {
    const s = state.current;
    s.basePos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- khởi tạo chunk theo vị trí camera thực (chỉ có sau khi mount)
    setChunks(
      CHUNK_OFFSETS.map((o) => ({
        key: `${o.dx},${o.dy},${o.dz}`,
        cx: o.dx,
        cy: o.dy,
        cz: o.dz,
      }))
    );
  }, [camera]);

  return (
    <>
      {chunks.map((chunk) => (
        <Chunk
          key={chunk.key}
          cx={chunk.cx}
          cy={chunk.cy}
          cz={chunk.cz}
          media={media}
          cameraGridRef={cameraGridRef}
          onHoverChange={onHoverChange}
        />
      ))}
    </>
  );
}

export function InfiniteCanvasScene({
  media,
  onMediaSelect,
  onTextureProgress,
  showFps = false,
  showControls = false,
  cameraFov = 60,
  cameraNear = 1,
  cameraFar = 500,
  fogNear = 120,
  fogFar = 320,
  backgroundColor = "#ffffff",
  fogColor = "#ffffff",
}: InfiniteCanvasProps) {
  const isTouchDevice = useIsTouchDevice();
  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.25 : 1.5);

  if (!media.length) {
    return null;
  }

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className="infinite-canvas" data-infinite-canvas="" data-cursor="grab">
        <Canvas
          camera={{ position: [0, 0, INITIAL_CAMERA_Z], fov: cameraFov, near: cameraNear, far: cameraFar }}
          dpr={dpr}
          flat
          gl={{ antialias: false, powerPreference: "high-performance" }}
          className="infinite-canvas__canvas"
        >
          <color attach="background" args={[backgroundColor]} />
          <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
          <SceneController
            media={media}
            onMediaSelect={onMediaSelect}
            onTextureProgress={onTextureProgress}
          />
          {showFps ? <Stats className="infinite-canvas__stats" /> : null}
        </Canvas>

        {showControls ? (
          <div className="infinite-canvas__controls">
            {isTouchDevice ? (
              <>
                <b>Drag</b> Pan · <b>Pinch</b> Zoom
              </>
            ) : (
              <>
                <b>WASD</b> Move · <b>QE</b> Up/Down · <b>Scroll/Space</b> Zoom
              </>
            )}
          </div>
        ) : null}
      </div>
    </KeyboardControls>
  );
}
