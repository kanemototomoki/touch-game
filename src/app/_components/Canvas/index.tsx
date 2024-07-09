"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import { useMouse } from "react-use";

type RelativePoint = {
  x: number; // 0 to 1
  y: number; // 0 to 1
};

interface CenterElement {
  id: string;
  color: string;
  size: number; // 0 to 1, relative to the smaller dimension of the canvas
}

interface CanvasProps {
  centerElements?: CenterElement[];
}

const defaultCenterElements: CenterElement[] = [
  { id: "1", color: "rgba(255, 0, 0, 0.5)", size: 0.2 },
  { id: "2", color: "rgba(0, 255, 0, 0.5)", size: 0.2 },
  { id: "3", color: "rgba(0, 0, 255, 0.5)", size: 0.2 },
];

const Canvas: React.FC<CanvasProps> = ({
  centerElements = defaultCenterElements,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [touchedElementId, setTouchedElementId] = useState<string | null>(null);
  const [initialTouchedElementId, setInitialTouchedElementId] = useState<
    string | null
  >(null);
  const [drawnIcons, setDrawnIcons] = useState<RelativePoint[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { docX, docY } = useMouse(canvasRef);

  const iconRef = useRef<HTMLImageElement | null>(null);
  const lastPositionRef = useRef<RelativePoint | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const getCenterCoordinates = useCallback(
    () => ({
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    }),
    [canvasSize]
  );

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
    (relativeX: number, relativeY: number, addToState = true) => {
      const ctx = getContext();
      const icon = iconRef.current;
      if (ctx && icon) {
        const iconSize = 20;
        const x = relativeX * canvasSize.width;
        const y = relativeY * canvasSize.height;
        ctx.drawImage(
          icon,
          x - iconSize / 2,
          y - iconSize / 2,
          iconSize,
          iconSize
        );
        if (addToState) {
          setDrawnIcons((prev) => [...prev, { x: relativeX, y: relativeY }]);
        }
      }
    },
    [canvasSize]
  );

  const redrawIcons = useCallback(() => {
    drawnIcons.forEach(({ x, y }) => {
      drawIcon(x, y, false);
    });
  }, [drawIcon, drawnIcons]);

  useEffect(() => {
    const img = new Image();
    img.src = "/images/ok.png";
    img.onload = () => {
      iconRef.current = img;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      setCanvasSize({ width: innerWidth, height: innerHeight });
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    drawCenterElements();
    redrawIcons();
  }, [drawCenterElements, redrawIcons, canvasSize]);

  const getRelativeCoordinates = useCallback(
    (x: number, y: number): RelativePoint => ({
      x: x / canvasSize.width,
      y: y / canvasSize.height,
    }),
    [canvasSize.height, canvasSize.width]
  );

  const startDrawing = (x: number, y: number) => {
    setIsDrawing(true);
    const relativePoint = getRelativeCoordinates(x, y);
    lastPositionRef.current = relativePoint;

    for (let i = 0; i < centerElements.length; i++) {
      if (isInsideCenterElement(x, y, i)) {
        setTouchedElementId(centerElements[i].id);
        drawIcon(relativePoint.x, relativePoint.y);
        break;
      }
    }
  };

  const draw = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !lastPositionRef.current) return;

      const relativePoint = getRelativeCoordinates(x, y);

      const minDrawDistance =
        10 / Math.min(canvasSize.width, canvasSize.height);
      const distance = Math.hypot(
        relativePoint.x - lastPositionRef.current.x,
        relativePoint.y - lastPositionRef.current.y
      );

      if (distance >= minDrawDistance) {
        let isInsideAny = false;
        for (let i = 0; i < centerElements.length; i++) {
          if (isInsideCenterElement(x, y, i)) {
            isInsideAny = true;
            const elementId = centerElements[i].id;
            setTouchedElementId(elementId);
            // 変更点: ボックス内に入った時、まだinitialTouchedElementIdが設定されていなければ設定する
            if (initialTouchedElementId === null) {
              setInitialTouchedElementId(elementId);
            }
            drawIcon(relativePoint.x, relativePoint.y);
            break;
          }
        }
        if (!isInsideAny) {
          setTouchedElementId(null);
        }
        lastPositionRef.current = relativePoint;
      }
    },
    [
      isDrawing,
      getRelativeCoordinates,
      canvasSize.width,
      canvasSize.height,
      centerElements,
      isInsideCenterElement,
      initialTouchedElementId,
      drawIcon,
    ]
  );

  const endDrawing = () => {
    setIsDrawing(false);
    setTouchedElementId(null);
    lastPositionRef.current = null;
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

  return (
    <>
      <div className="fixed inset-0 overflow-hidden touch-none">
        <p>{isDrawing ? "Drawing" : "Not drawing"}</p>
        <p>
          docX: {docX} docY: {docY}
        </p>
        <p>Touched element ID: {touchedElementId || "None"}</p>
        <p>Initial touched element ID: {initialTouchedElementId || "None"}</p>
        <div className="flex flex-col items-center w-full h-full">
          <NextImage
            src="/images/cat.png"
            alt=""
            fill
            className="object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute w-full h-full z-10 cursor-pointer touch-none"
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
    </>
  );
};

export default Canvas;
