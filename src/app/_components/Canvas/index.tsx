"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import { useMouse } from "react-use";
type Point = {
  x: number;
  y: number;
};

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { docX, docY } = useMouse(canvasRef);

  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const getContext = () => {
    return canvasRef.current?.getContext("2d");
  };

  const startDrawing = (x: Point["x"], y: Point["y"]) => {
    setIsDrawing(true);
    const ctx = getContext();
    ctx?.moveTo(x, y);
  };

  const draw = (x: Point["x"], y: Point["y"]) => {
    if (!isDrawing) {
      return;
    }
    const ctx = getContext();
    ctx?.lineTo(x, y);
    ctx?.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <>
      <p>{isDrawing ? "Drawing" : "Not drawing"}</p>
      <p>
        docX: {docX} docY: {docY}
      </p>
      <div className="flex flex-col items-center w-full">
        <NextImage
          src="/images/cat.png"
          alt=""
          fill
          className="fixed top-0 left-0 w-full h-full"
        />
      </div>
      <canvas
        ref={canvasRef}
        className="fixed w-full h-full z-10 cursor-pointer"
        onMouseDown={(e) =>
          startDrawing(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        }
        onMouseUp={() => endDrawing()}
        onMouseLeave={() => endDrawing()}
        onMouseMove={(e) => draw(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
      />
    </>
  );
};

export default Canvas;
