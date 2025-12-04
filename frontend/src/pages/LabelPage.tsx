import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import apiClient from "../api/client";
import FrameNavigator from "../components/FrameNavigator";
import ImageCropper, { BBox } from "../components/ImageCropper";

type FrameMeta = {
  labeled?: boolean;
  label?: number;
  bbox?: BBox;
  crop_name?: string;
};

function LabelPage() {
  const { sessionId } = useParams();
  const [frames, setFrames] = useState<string[]>([]);
  const [frameMeta, setFrameMeta] = useState<Record<string, FrameMeta>>({});
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedLabel, setSelectedLabel] = useState<number | null>(null);
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [status, setStatus] = useState<string>("");
  const [filterUnlabeled, setFilterUnlabeled] = useState<boolean>(false);

  const normalizeFrameName = (frame: any): string | null => {
    if (!frame) return null;
    return frame.frame_name || frame.frame || null;
  };

  const fetchData = useCallback(async (): Promise<{ frames: string[]; meta: Record<string, FrameMeta> }> => {
    if (!sessionId) return { frames: [], meta: {} };
    try {
      const [framesRes, labelsRes] = await Promise.all([
        apiClient.get(`/api/videos/${sessionId}/frames`),
        apiClient.get(`/api/labels/${sessionId}`),
      ]);

      const frameNames: string[] = framesRes.data?.frames ?? [];
      const detail: any[] = labelsRes.data?.detail ?? [];

      const meta: Record<string, FrameMeta> = {};
      frameNames.forEach((name) => {
        meta[name] = { labeled: false };
      });
      detail.forEach((item) => {
        const name = normalizeFrameName(item);
        if (!name) return;
        meta[name] = {
          labeled: Boolean(item.labeled),
          label: item.label ?? null,
          bbox: item.bbox ?? null,
          crop_name: item.crop_name ?? null,
        };
      });

      setFrames(frameNames);
      setFrameMeta(meta);
      return { frames: frameNames, meta };
    } catch (error) {
      console.error(error);
      setStatus("获取帧或标注状态失败");
      return { frames: [], meta: {} };
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [sessionId]);

  const visibleFrames = useMemo(() => {
    return filterUnlabeled ? frames.filter((name) => !frameMeta[name]?.labeled) : frames;
  }, [frames, frameMeta, filterUnlabeled]);

  useEffect(() => {
    if (currentIndex >= visibleFrames.length) {
      setCurrentIndex(Math.max(visibleFrames.length - 1, 0));
    }
  }, [visibleFrames, currentIndex]);

  const currentFrame = visibleFrames[currentIndex] ?? null;

  useEffect(() => {
    if (!currentFrame) return;
    const meta = frameMeta[currentFrame];
    setSelectedLabel(meta?.label ?? null);
    setBbox(meta?.bbox ?? null);
  }, [currentFrame, frameMeta]);

  const imageUrl = useMemo(() => {
    if (!sessionId || !currentFrame) {
      return null;
    }
    return `${apiClient.defaults.baseURL}/api/videos/${sessionId}/frames/${currentFrame}`;
  }, [sessionId, currentFrame]);

  const submitLabel = async () => {
    if (!sessionId || !currentFrame || bbox === null || selectedLabel === null) {
      setStatus("请先选择标签并设置裁剪框");
      return;
    }

    try {
      await apiClient.post(`/api/labels/${sessionId}/frame/${currentFrame}`, {
        bbox,
        label: selectedLabel,
      });
      setStatus(`已保存 ${currentFrame}`);
      const { frames: refreshedFrames, meta } = await fetchData();
      const nextVisible = filterUnlabeled
        ? refreshedFrames.filter((name) => !meta[name]?.labeled)
        : refreshedFrames;
      const nextIndex =
        nextVisible.length === 0
          ? 0
          : Math.min(filterUnlabeled ? currentIndex : currentIndex + 1, nextVisible.length - 1);
      setCurrentIndex(nextIndex);
    } catch (error) {
      console.error(error);
      setStatus("保存失败，请检查后端接口");
    }
  };

  const exportDataset = async () => {
    if (!sessionId) {
      setStatus("缺少 sessionId，无法导出");
      return;
    }
    try {
      const { data } = await apiClient.post(`/api/export/${sessionId}`);
      const downloadUrl = data.download_url;
      if (downloadUrl) {
        const fullUrl = `${apiClient.defaults.baseURL}${downloadUrl}`;
        setStatus("正在导出数据集...");
        window.open(fullUrl, "_blank");
      } else {
        setStatus("导出完成，但未返回下载链接");
      }
    } catch (error) {
      console.error(error);
      setStatus("导出失败，请稍后重试");
    }
  };

  return (
    <main style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>标注页面</h2>
          <p>Session: {sessionId ?? "未提供"}</p>
          <p>总计：{frames.length}，已标注：{frames.filter((name) => frameMeta[name]?.labeled).length}</p>
        </div>
        <FrameNavigator
          currentIndex={currentIndex}
          total={visibleFrames.length}
          onPrev={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
          onNext={() => setCurrentIndex((index) => Math.min(index + 1, visibleFrames.length - 1))}
        />
      </header>

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button type="button" onClick={() => setFilterUnlabeled((prev) => !prev)}>
            {filterUnlabeled ? "显示全部" : "只看未标注"}
          </button>
          <button type="button" onClick={() => fetchData()}>刷新状态</button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {visibleFrames.map((name, idx) => {
            const labeled = frameMeta[name]?.labeled;
            const url = `${apiClient.defaults.baseURL}/api/videos/${sessionId}/frames/${name}`;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                style={{
                  border: idx === currentIndex ? "2px solid #1e90ff" : "1px solid #ccc",
                  padding: 2,
                  background: labeled ? "#e6ffed" : "#fff",
                  cursor: "pointer",
                }}
              >
                <img src={url} alt={name} style={{ width: 96, height: 54, objectFit: "cover", display: "block" }} />
                <small style={{ display: "block", textAlign: "center" }}>
                  {labeled ? "✅" : "⬜️"} {name}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <ImageCropper imageUrl={imageUrl} value={bbox} onChange={setBbox} />

      <section style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSelectedLabel(value)}
            style={{
              padding: "0.5rem 0.75rem",
              background: selectedLabel === value ? "#1e90ff" : "#f2f2f2",
              color: selectedLabel === value ? "#fff" : "#000",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          >
            {value}
          </button>
        ))}
        <button type="button" onClick={submitLabel}>
          保存并下一张
        </button>
        <button type="button" onClick={exportDataset}>
          导出数据集
        </button>
      </section>

      {status && <p>{status}</p>}
    </main>
  );
}

export default LabelPage;
