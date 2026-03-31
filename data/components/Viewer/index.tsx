import style from "./style.module.scss";
import { useEffect, useRef, useState } from "react";
import { NextPage } from "next";

type randerMode = "pixelated" | "auto";

const lang = {
  "resetTransform": "Reset Transform",
  "randerMode": "Rander Mode : ",
  "randerMode.auto": "Auto",
  "randerMode.pixelated": "Pixelated",
}

export type ViewerProps = {
  defaultRanderMode?: randerMode;
  backgroundColor?: string;
  contro?: boolean;
  tTranslate?: {
    "resetTransform"?: string
    "randerMode"?: string
    "randerMode.auto"?: string
    "randerMode.pixelated"?: string
  }
}

const Viewer: NextPage<React.ComponentProps<"div"> & ViewerProps> = (Prop) => {
  const t = (key: keyof typeof lang) => {
    const list = Prop.tTranslate ?? lang;
    const tt = list[key] ?? lang[key];
    return tt;
  };

  const [bgColor, setBgColor] = useState<string>(Prop.defaultRanderMode ?? "#00000000");
  const [randerMode, setRanderMode] = useState<randerMode>(Prop.defaultRanderMode ?? "auto");
  const [state, setState] = useState<{ x: number, y: number, scale: number, }>({ x: 0, y: 0, scale: 0, })

  const gestureRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  const historyRef = useRef<{ x: number; y: number; time: number }[]>([]);

  useEffect(() => {
    const gestureLayer = gestureRef.current;
    const transformLayer = transformRef.current;
    const resetBtn = resetBtnRef.current;

    const ZOOM_MAX = 100;
    const ZOOM_MIN = .1;

    if (!gestureLayer || !transformLayer) return;

    transformLayer.style.transformOrigin = "0 0";

    const state = {
      x: 0,
      y: 0,
      scale: 1,

      vx: 0,
      vy: 0,

      friction: .9,
      animationId: 0,

      lastX: 0,
      lastY: 0,
      lastDist: 0,
      isDragging: false,
      mouseX: 0,
      mouseY: 0,
    };

    function getCompensatedPoint(clientX: number, clientY: number) {
      const rect = gestureLayer!.getBoundingClientRect();

      const scaleX = gestureLayer!.offsetWidth > 0 ? rect.width / gestureLayer!.offsetWidth : 1;
      const compScale = scaleX || 1; // 避免為 0 或 NaN

      return {
        x: (clientX - rect.left) / compScale,
        y: (clientY - rect.top) / compScale,
        scale: compScale
      };
    }

    function updateTransform() {
      transformLayer!.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
      setState({ x: state.x, y: state.y, scale: state.scale });
    }

    function resetTransform() {
      state.x = 0;
      state.y = 0;
      state.scale = 1;
      updateTransform();
    }

    function trackMovement(currentX: number, currentY: number) {
      const now = performance.now();
      historyRef.current.push({ x: currentX, y: currentY, time: now });

      while (historyRef.current.length > 0 && now - historyRef.current[0].time > 100) {
        historyRef.current.shift();
      }
    }

    function startInertia() {
      if (Math.abs(state.vx) < 0.05 && Math.abs(state.vy) < 0.05) {
        state.vx = 0;
        state.vy = 0;
        return;
      }

      state.x += state.vx * 16;
      state.y += state.vy * 16;

      state.vx *= state.friction;
      state.vy *= state.friction;

      updateTransform();
      state.animationId = requestAnimationFrame(startInertia);
    }

    function stopInertia() {
      cancelAnimationFrame(state.animationId);
      state.vx = 0;
      state.vy = 0;
    }

    function applyReleaseVelocity() {
      const now = performance.now();
      const history = historyRef.current;

      if (history.length < 2) return;

      const oldest = history[0];
      const newest = history[history.length - 1];

      const timeDiff = newest.time - oldest.time;
      if (timeDiff <= 0 || now - newest.time > 100) {
        state.vx = 0;
        state.vy = 0;
        return;
      }

      state.vx = (newest.x - oldest.x) / timeDiff;
      state.vy = (newest.y - oldest.y) / timeDiff;

      const MAX_SPEED = 5;
      state.vx = Math.max(-MAX_SPEED, Math.min(state.vx, MAX_SPEED));
      state.vy = Math.max(-MAX_SPEED, Math.min(state.vy, MAX_SPEED));

      startInertia();
    }

    const handleTouchStartOrEnd = (e: TouchEvent) => {
      const touches = e.touches;

      if (e.type === 'touchstart') {
        stopInertia();
        historyRef.current = [];
      }

      if (touches.length === 1) {
        const pt = getCompensatedPoint(touches[0].clientX, touches[0].clientY);
        state.lastX = pt.x;
        state.lastY = pt.y;
        trackMovement(state.lastX, state.lastY);
      } else if (touches.length === 2) {
        const pt1 = getCompensatedPoint(touches[0].clientX, touches[0].clientY);
        const pt2 = getCompensatedPoint(touches[1].clientX, touches[1].clientY);
        state.lastDist = Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
        state.lastX = (pt1.x + pt2.x) / 2;
        state.lastY = (pt1.y + pt2.y) / 2;
      }

      if (e.type === 'touchend' && touches.length === 0) {
        applyReleaseVelocity();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;

      if (touches.length === 1) {
        const pt = getCompensatedPoint(touches[0].clientX, touches[0].clientY);
        const currentX = pt.x;
        const currentY = pt.y;

        const deltaX = currentX - state.lastX;
        const deltaY = currentY - state.lastY;

        state.x += deltaX;
        state.y += deltaY;
        state.lastX = currentX;
        state.lastY = currentY;

        trackMovement(state.lastX, state.lastY);

      } else if (touches.length === 2) {
        historyRef.current = [];

        const pt1 = getCompensatedPoint(touches[0].clientX, touches[0].clientY);
        const pt2 = getCompensatedPoint(touches[1].clientX, touches[1].clientY);

        const currentDist = Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
        const currentX = (pt1.x + pt2.x) / 2;
        const currentY = (pt1.y + pt2.y) / 2;

        const rawZoom = currentDist / state.lastDist;
        let nextScale = state.scale * rawZoom;
        nextScale = Math.max(ZOOM_MIN, Math.min(nextScale, ZOOM_MAX));

        const effectiveZoom = nextScale / state.scale;

        state.x -= (currentX - state.x) * (effectiveZoom - 1);
        state.y -= (currentY - state.y) * (effectiveZoom - 1);

        state.x += (currentX - state.lastX);
        state.y += (currentY - state.lastY);

        state.scale = nextScale;
        state.lastDist = currentDist;
        state.lastX = currentX;
        state.lastY = currentY;
      }
      updateTransform();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.button === 1) || e.button === 0) {
        e.preventDefault();
        stopInertia();
        historyRef.current = [];

        const pt = getCompensatedPoint(e.clientX, e.clientY);

        state.isDragging = true;
        state.mouseX = pt.x;
        state.mouseY = pt.y;
        gestureLayer.style.cursor = "grabbing";

        trackMovement(state.mouseX, state.mouseY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      e.preventDefault();

      const pt = getCompensatedPoint(e.clientX, e.clientY);
      const currentX = pt.x;
      const currentY = pt.y;

      const deltaX = currentX - state.mouseX;
      const deltaY = currentY - state.mouseY;

      state.x += deltaX;
      state.y += deltaY;

      state.mouseX = currentX;
      state.mouseY = currentY;

      trackMovement(currentX, currentY);
      updateTransform();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!state.isDragging) return;
      state.isDragging = false;
      gestureLayer.style.cursor = "default";
      applyReleaseVelocity();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();

      const pt = getCompensatedPoint(e.clientX, e.clientY);
      const currentX = pt.x;
      const currentY = pt.y;

      const TOUCHPAD_ZOOM_SENSITIVITY = 0.01;
      const MOUSE_ZOOM_SENSITIVITY = 0.002;
      const TOUCHPAD_PAN_SENSITIVITY = 2.0;

      const isTouchpadPinch = e.ctrlKey;
      const isMouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 20);

      if (isTouchpadPinch || isMouseWheel) {
        const zoomSensitivity = isTouchpadPinch ? TOUCHPAD_ZOOM_SENSITIVITY : MOUSE_ZOOM_SENSITIVITY;
        const zoomFactor = Math.exp(-e.deltaY * (e.shiftKey ? zoomSensitivity : zoomSensitivity * .5));

        let nextScale = state.scale * zoomFactor;
        nextScale = Math.max(ZOOM_MIN, Math.min(nextScale, ZOOM_MAX));
        const effectiveZoom = nextScale / state.scale;

        state.x -= (currentX - state.x) * (effectiveZoom - 1);
        state.y -= (currentY - state.y) * (effectiveZoom - 1);
        state.scale = nextScale;
      }
      else {
        const TouchpadPanSensitivity = (e.shiftKey ? TOUCHPAD_PAN_SENSITIVITY * 2 : TOUCHPAD_PAN_SENSITIVITY)
        state.x -= (e.deltaX / pt.scale) * TouchpadPanSensitivity;
        state.y -= (e.deltaY / pt.scale) * TouchpadPanSensitivity;
      }

      updateTransform();
    };

    gestureLayer.addEventListener("touchstart", handleTouchStartOrEnd, { passive: false });
    gestureLayer.addEventListener("touchend", handleTouchStartOrEnd);
    gestureLayer.addEventListener("touchcancel", handleTouchStartOrEnd);
    gestureLayer.addEventListener("touchmove", handleTouchMove, { passive: false });

    gestureLayer.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    resetBtn?.addEventListener("click", resetTransform);

    gestureLayer.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stopInertia();
      gestureLayer.removeEventListener("touchstart", handleTouchStartOrEnd);
      gestureLayer.removeEventListener("touchend", handleTouchStartOrEnd);
      gestureLayer.removeEventListener("touchcancel", handleTouchStartOrEnd);
      gestureLayer.removeEventListener("touchmove", handleTouchMove);

      gestureLayer.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      resetBtn?.removeEventListener("click", resetTransform);

      gestureLayer.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    resetBtnRef.current?.click();
  }, [])

  return (
    <>
      <div className={style["Frame"]}>
        {(Prop.contro ?? true) && <div className={style["GUI"]}>
          <div className={style["Bar"]}>
            <div className={style["Contro"]}>
              <button ref={resetBtnRef}>{t("resetTransform")}</button>
              <button onClick={() => setRanderMode(e => e === "pixelated" ? "auto" : "pixelated")}>{`${t("randerMode")}${randerMode === "auto" ? t("randerMode.auto") : t("randerMode.pixelated")}`}</button>
              <input type="color" onChange={e => setBgColor(e.currentTarget.value)} />
            </div>
            <div className={style["Value"]}><span>{`X:${~~(state.x)} // Y:${~~(state.y)} // S:${~~(state.scale * 100)}%`}</span></div>
          </div>
        </div>}
        <div className={style["Img"]} ref={gestureRef}>
          <div className={style["Tar"]} ref={transformRef} style={{ imageRendering: randerMode, backgroundColor: bgColor }} >
            <div {...Prop} />
          </div>
        </div>
      </div >
    </>
  );
}

export default Viewer;