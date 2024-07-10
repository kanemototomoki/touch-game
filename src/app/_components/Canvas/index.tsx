"use client";

import { useState, useRef, useEffect, useCallback, useMemo, use } from "react";
import NextImage from "next/image";
import { useMouse, useScratch } from "react-use";

import { Debug } from "../Debug";
import { cn } from "../../_utils";

import CatImage from "../../../../public/images/cat.png";
import SafeZoneIcon from "../../../../public/images/ok.png";
import dangerZoneIcon from "../../../../public/images/ng.svg";
import TraceIcon from "../../../../public/images/star.svg";

type RelativePoint = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};

type IconType = "safe" | "danger" | "trace";

type DrawnIcon = RelativePoint & {
  type: IconType;
};

interface CenterElement {
  id: string;
  color: string;
  size: number; // 0 to 1, relative to the smaller dimension of the canvas
}

type Props = {
  centerElements?: CenterElement[];
};

const defaultCenterElements: CenterElement[] = [
  { id: "1", color: "rgba(255, 0, 0, 0.5)", size: 0.2 },
  { id: "2", color: "rgba(0, 255, 0, 0.5)", size: 0.2 },
  { id: "3", color: "rgba(0, 0, 255, 0.5)", size: 0.2 },
];

const Canvas: React.FC<Props> = ({
  centerElements = defaultCenterElements,
}) => {
  const [scratchRef, scratchState] = useScratch();
  const isDrawing = useMemo(() => scratchState.isScratching, [scratchState]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [touchedElementId, setTouchedElementId] = useState<string | null>(null);
  const [initialTouchedElementId, setInitialTouchedElementId] = useState<
    string | null
  >(null);
  const [drawnIcons, setDrawnIcons] = useState<DrawnIcon[]>([]);
  const [cursorPosition, setCursorPosition] = useState<RelativePoint | null>(
    null
  );
  const [isInSafeZone, setIsInSafeZone] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { docX, docY } = useMouse(canvasRef);

  const lastPositionRef = useRef<RelativePoint | null>(null);

  const safeZoneIconRef = useRef<HTMLImageElement | null>(null);
  const dangerZoneIconRef = useRef<HTMLImageElement | null>(null);
  const traceIconRef = useRef<HTMLImageElement | null>(null);

  const getCenterCoordinates = useCallback(
    () => ({
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    }),
    [canvasSize]
  );

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image) {
      canvas.width = image.width;
      canvas.height = image.height;
      setCanvasSize({ width: image.width, height: image.height });
    }
  }, []);

  const getAbsoluteCenterElementSize = useCallback(
    (size: number) => {
      const smallerDimension = Math.min(canvasSize.width, canvasSize.height);
      return smallerDimension * size;
    },
    [canvasSize]
  );

  const isInsideCenterElement = useCallback(
    (x: number, y: number, elementIndex: number) => {
      const { x: centerX, y: centerY } = getCenterCoordinates();
      const element = centerElements[elementIndex];
      const halfSize = getAbsoluteCenterElementSize(element.size) / 2;
      const offsetX = (elementIndex - 1) * halfSize * 2.5; // Adjust spacing between elements
      return (
        x >= centerX - halfSize + offsetX &&
        x <= centerX + halfSize + offsetX &&
        y >= centerY - halfSize &&
        y <= centerY + halfSize
      );
    },
    [getCenterCoordinates, getAbsoluteCenterElementSize, centerElements]
  );

  const getContext = () => canvasRef.current?.getContext("2d");

  const drawCenterElements = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    const { x: centerX, y: centerY } = getCenterCoordinates();

    centerElements.forEach((element, index) => {
      const size = getAbsoluteCenterElementSize(element.size);
      const offsetX = (index - 1) * size * 1.25; // Adjust spacing between elements

      ctx.fillStyle = element.color;
      ctx.fillRect(
        centerX - size / 2 + offsetX,
        centerY - size / 2,
        size,
        size
      );
    });
  }, [getCenterCoordinates, getAbsoluteCenterElementSize, centerElements]);

  const drawIcon = useCallback(
    (
      relativeX: number,
      relativeY: number,
      iconType: IconType,
      addToState = true
    ) => {
      const ctx = getContext();
      const icon =
        iconType === "safe"
          ? safeZoneIconRef.current
          : iconType === "danger"
          ? dangerZoneIconRef.current
          : traceIconRef.current;
      if (ctx && icon) {
        const iconSize = iconType === "trace" ? 30 : 40; // OKとNGアイコンを大きくする
        const x = relativeX * canvasSize.width;
        const y = relativeY * canvasSize.height;
        ctx.drawImage(
          icon,
          x - iconSize / 2,
          y - iconSize / 2,
          iconSize,
          iconSize
        );
        if (addToState && iconType === "trace") {
          setDrawnIcons((prev) => [
            ...prev,
            { x: relativeX, y: relativeY, type: iconType },
          ]);
        }
      }
    },
    [canvasSize]
  );

  const redrawIcons = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    drawCenterElements();

    drawnIcons.forEach(({ x, y, type }) => {
      drawIcon(x, y, type, false);
    });

    if (isDrawing && cursorPosition) {
      drawIcon(
        cursorPosition.x,
        cursorPosition.y,
        isInSafeZone ? "safe" : "danger",
        false
      );
    }
  }, [
    drawIcon,
    drawnIcons,
    canvasSize,
    drawCenterElements,
    isDrawing,
    cursorPosition,
    isInSafeZone,
  ]);

  useEffect(() => {
    const loadImage = (src: string) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
      });
    };

    Promise.all([
      loadImage(SafeZoneIcon.src),
      loadImage(dangerZoneIcon.src),
      loadImage(TraceIcon.src),
    ]).then(([okImg, ngImg, starImg]) => {
      safeZoneIconRef.current = okImg;
      dangerZoneIconRef.current = ngImg;
      traceIconRef.current = starImg;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new AbortController();

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    redrawIcons();
  }, [redrawIcons, canvasSize, cursorPosition, isInSafeZone]);

  const getRelativeCoordinates = useCallback(
    (x: number, y: number): RelativePoint => ({
      x: x / canvasSize.width,
      y: y / canvasSize.height,
    }),
    [canvasSize.height, canvasSize.width]
  );

  const checkSafeZone = useCallback(
    (x: number, y: number) => {
      for (let i = 0; i < centerElements.length; i++) {
        if (isInsideCenterElement(x, y, i)) {
          return true;
        }
      }
      return false;
    },
    [centerElements, isInsideCenterElement]
  );

  const startDrawing = (x: number, y: number) => {
    const relativePoint = getRelativeCoordinates(x, y);
    lastPositionRef.current = relativePoint;
    setCursorPosition(relativePoint);

    const inSafeZone = checkSafeZone(x, y);
    setIsInSafeZone(inSafeZone);

    const touchedId =
      centerElements.find((_, i) => isInsideCenterElement(x, y, i))?.id || null;

    if (inSafeZone) {
      setTouchedElementId(touchedId);
      setInitialTouchedElementId(touchedId);
    } else {
      setTouchedElementId(null);
    }
  };

  const draw = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !lastPositionRef.current) return;

      const relativePoint = getRelativeCoordinates(x, y);
      setCursorPosition(relativePoint);

      const inSafeZone = checkSafeZone(x, y);
      setIsInSafeZone(inSafeZone);

      const minDrawDistance =
        10 / Math.min(canvasSize.width, canvasSize.height);
      const distance = Math.hypot(
        relativePoint.x - lastPositionRef.current.x,
        relativePoint.y - lastPositionRef.current.y
      );

      if (distance >= minDrawDistance && inSafeZone) {
        drawIcon(relativePoint.x, relativePoint.y, "trace");
        lastPositionRef.current = relativePoint;
      }

      if (inSafeZone) {
        const touchedId =
          centerElements.find((_, i) => isInsideCenterElement(x, y, i))?.id ||
          null;
        setTouchedElementId(touchedId);
        // initialTouchedElementIdが未設定の場合のみ更新
        setInitialTouchedElementId((prev) =>
          prev === null ? touchedId : prev
        );
      } else {
        setTouchedElementId(null);
      }
    },
    [
      isDrawing,
      getRelativeCoordinates,
      canvasSize.width,
      canvasSize.height,
      checkSafeZone,
      drawIcon,
      centerElements,
      isInsideCenterElement,
    ]
  );

  const endDrawing = () => {
    setTouchedElementId(null);
    lastPositionRef.current = null;
    setCursorPosition(null);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        draw(x, y);
      }
    },
    [draw, isDrawing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        draw(x, y);
      }
    },
    [draw, isDrawing]
  );

  useEffect(() => {
    if (imageRef.current) {
      updateCanvasSize();
    }
  }, [updateCanvasSize]);

  return (
    <>
      <div className={cn("overflow-hidden touch-none")}>
        <div className="grid place-items-center">
          <Debug
            isDrawing={isDrawing}
            docX={docX}
            docY={docY}
            touchedElementId={touchedElementId}
            initialTouchedElementId={initialTouchedElementId}
            className={cn("row-start-1 col-start-1 self-start")}
          />
          <div ref={scratchRef} className="grid place-items-center select-none">
            <NextImage
              ref={imageRef}
              src={CatImage}
              alt=""
              width={834}
              className={cn("object-cover border-2", "row-start-1 col-start-1")}
            />
            <canvas
              ref={canvasRef}
              className={cn(
                "z-10 cursor-pointer touch-none",
                "row-start-1 col-start-1",
                {
                  "cursor-none": isDrawing,
                }
              )}
              onMouseDown={(e) =>
                startDrawing(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
              }
              onMouseMove={handleMouseMove}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                  startDrawing(
                    touch.clientX - rect.left,
                    touch.clientY - rect.top
                  );
                }
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={endDrawing}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Canvas;
