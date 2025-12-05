import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  imageUrl: string | null;
  cropSize: number | null;
  canSelect: boolean;
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

function ImageCropper({ imageUrl, value, onChange, cropSize, canSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [drawBox, setDrawBox] = useState<DrawBox | null>(null);

  const displaySize = useMemo(() => {
    if (!loaded) return { width: 0, height: 0 };
    const displayWidth = Math.min(MAX_DISPLAY_WIDTH, loaded.naturalWidth);
    const scale = loaded.naturalWidth / displayWidth;
    return { width: displayWidth, height: loaded.naturalHeight / scale };
  }, [loaded]);

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
    const scaleX = loaded.naturalWidth / displaySize.width;
    const size = Math.max(value.width, value.height) / scaleX;
    const clampedX = Math.max(0, Math.min(value.x / scaleX, displaySize.width - size));
    const clampedY = Math.max(0, Math.min(value.y / scaleX, displaySize.height - size));
    setDrawBox({ x: clampedX, y: clampedY, size });
  }, [loaded, value, displaySize.width, displaySize.height]);

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

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || !onChange || !canSelect || !cropSize) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const xOnCanvas = (event.clientX - rect.left) * (canvas.width / rect.width);
    const yOnCanvas = (event.clientY - rect.top) * (canvas.height / rect.height);
    const scaleX = loaded.naturalWidth / canvas.width;
    const scaleY = loaded.naturalHeight / canvas.height;
    const naturalCenterX = xOnCanvas * scaleX;
    const naturalCenterY = yOnCanvas * scaleY;
    const maxSize = Math.min(cropSize, loaded.naturalWidth, loaded.naturalHeight);
    const half = maxSize / 2;
    let bx = Math.round(naturalCenterX - half);
    let by = Math.round(naturalCenterY - half);
    if (bx < 0) bx = 0;
    if (by < 0) by = 0;
    if (bx + maxSize > loaded.naturalWidth) {
      bx = loaded.naturalWidth - maxSize;
    }
    if (by + maxSize > loaded.naturalHeight) {
      by = loaded.naturalHeight - maxSize;
    }
    const bbox = { x: bx, y: by, width: maxSize, height: maxSize };
    onChange(bbox);
    setDrawBox({
      x: bbox.x / scaleX,
      y: bbox.y / scaleY,
      size: bbox.width / scaleX,
    });
  };

  return (
    <div className="card-padding" style={{ width: "100%" }}>
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          style={{ width: "100%", maxWidth: `${MAX_DISPLAY_WIDTH}px`, touchAction: "none", display: "block" }}
          onPointerDown={handlePointerDown}
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

export default ImageCropper;
