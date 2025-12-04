import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  imageUrl: string | null;
  value: BBox | null;
  onChange?: (bbox: BBox) => void;
};

type LoadedImage = {
  element: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
};

type DrawBox = {
  x: number;
  y: number;
  size: number;
};

const MAX_DISPLAY_WIDTH = 720;

function ImageCropper({ imageUrl, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [drawBox, setDrawBox] = useState<DrawBox | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const scale = useMemo(() => {
    if (!loaded) return 1;
    const displayWidth = Math.min(MAX_DISPLAY_WIDTH, loaded.naturalWidth);
    return loaded.naturalWidth / displayWidth;
  }, [loaded]);

  const displaySize = useMemo(() => {
    if (!loaded) return { width: 0, height: 0 };
    const displayWidth = Math.min(MAX_DISPLAY_WIDTH, loaded.naturalWidth);
    return { width: displayWidth, height: loaded.naturalHeight / scale };
  }, [loaded, scale]);

  // Load image
  useEffect(() => {
    if (!imageUrl) {
      setLoaded(null);
      setDrawBox(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLoaded({ element: img, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      setDrawBox(null);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Sync external bbox into draw space
  useEffect(() => {
    if (!loaded || !value) return;
    const { x, y, width, height } = value;
    const size = Math.max(width, height) / scale;
    setDrawBox({ x: x / scale, y: y / scale, size });
  }, [loaded, value, scale]);

  // Draw image + overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(loaded.element, 0, 0, canvas.width, canvas.height);

    if (drawBox) {
      ctx.save();
      ctx.strokeStyle = "#1e90ff";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(30, 144, 255, 0.2)";
      ctx.fillRect(drawBox.x, drawBox.y, drawBox.size, drawBox.size);
      ctx.strokeRect(drawBox.x, drawBox.y, drawBox.size, drawBox.size);
      ctx.restore();
    }
  }, [loaded, drawBox, displaySize]);

  const toNatural = (box: DrawBox): BBox => ({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.size * scale),
    height: Math.round(box.size * scale),
  });

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!loaded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setDragStart({ x, y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || !loaded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));

    const boxX = dx >= 0 ? dragStart.x : dragStart.x - size;
    const boxY = dy >= 0 ? dragStart.y : dragStart.y - size;

    const clamped = clampBox(boxX, boxY, size, displaySize.width, displaySize.height);
    setDrawBox(clamped);
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || !drawBox || !onChange) {
      setDragStart(null);
      return;
    }
    onChange(toNatural(drawBox));
    setDragStart(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="card-padding" style={{ width: "100%" }}>
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          style={{ width: "100%", maxWidth: `${MAX_DISPLAY_WIDTH}px`, touchAction: "none", display: "block" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      ) : (
        <p className="status">选择一帧后显示图像</p>
      )}
      <div className="status" style={{ marginTop: "8px" }}>
        {value ? `x ${value.x}, y ${value.y}, w ${value.width}, h ${value.height}` : "等待裁剪框"}
      </div>
    </div>
  );
}

function clampBox(x: number, y: number, size: number, maxWidth: number, maxHeight: number): DrawBox {
  let cx = x;
  let cy = y;
  let csize = size;

  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cx + csize > maxWidth) csize = maxWidth - cx;
  if (cy + csize > maxHeight) csize = maxHeight - cy;

  // 防止裁剪框塌缩
  csize = Math.max(10, csize);
  return { x: cx, y: cy, size: csize };
}

export default ImageCropper;
