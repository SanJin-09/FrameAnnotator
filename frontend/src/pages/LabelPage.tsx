import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import apiClient from "../api/client";
import ImageCropper, { BBox } from "../components/ImageCropper";

type FrameMeta = {
  labeled?: boolean;
  label?: number;
  bbox?: BBox;
  crop_name?: string;
};

const styles = {
  pageContainer: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    flexDirection: "column" as const,
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    overflow: "hidden",
  },
  header: {
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    borderBottom: "1px solid #e5e5e5",
    backgroundColor: "#ffffff",
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: '"Playfair Display", serif', // Assuming serif font is available
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#111",
    letterSpacing: "-0.02em",
  },
  headerActions: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  mainWorkspace: {
    flex: 1,
    display: "flex",
    overflow: "hidden", // Prevents body scroll
  },
  canvasArea: {
    flex: 1,
    backgroundColor: "#f9f9f9", // Soft grey for contrast
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  sidebar: {
    width: "320px",
    backgroundColor: "#ffffff",
    borderLeft: "1px solid #e5e5e5",
    display: "flex",
    flexDirection: "column" as const,
    padding: "32px 24px",
    gap: "32px",
    boxShadow: "-5px 0 20px rgba(0,0,0,0.02)",
    overflowY: "auto" as const,
  },
  filmstripContainer: {
    height: "100px",
    borderTop: "1px solid #e5e5e5",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 24px",
    overflowX: "auto" as const,
    whiteSpace: "nowrap" as const,
  },
  // UI Elements
  button: {
    padding: "8px 16px",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "transparent",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: 500,
  },
  primaryButton: {
    backgroundColor: "#111",
    color: "#fff",
    border: "1px solid #111",
  },
  ghostButton: {
    border: "none",
    color: "#666",
  },
  labelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  labelBtn: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #eee",
    borderRadius: "8px",
    fontSize: "1.2rem",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "all 0.2s",
  },
  activeLabelBtn: {
    backgroundColor: "#111",
    color: "#fff",
    borderColor: "#111",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  thumb: {
    height: "70px",
    width: "auto",
    borderRadius: "4px",
    border: "2px solid transparent",
    cursor: "pointer",
    opacity: 0.7,
    transition: "all 0.2s",
  },
  thumbActive: {
    borderColor: "#111",
    opacity: 1,
    transform: "scale(1.05)",
  },
  statusText: {
    fontSize: "0.75rem",
    color: "#888",
    marginTop: "8px",
    textAlign: "center" as const,
  },
  sectionTitle: {
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "#999",
    marginBottom: "16px",
    fontWeight: 600,
  }
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

  const handlePrev = () => setCurrentIndex((index) => Math.max(index - 1, 0));
  const handleNext = () => setCurrentIndex((index) => Math.min(index + 1, visibleFrames.length - 1));

  return (
    <div style={styles.pageContainer}>
      
      {/* 1. Header: Slim, clean, global actions only */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={styles.headerTitle}>姿态标注</h2>
          <span style={{ fontSize: '0.8rem', color: '#999', paddingTop: '4px' }}>
            {sessionId}
          </span>
        </div>
        
        <div style={styles.headerActions}>
           <div style={{ fontSize: '0.85rem', color: '#666', marginRight: '12px' }}>
              进度: {frames.filter((name) => frameMeta[name]?.labeled).length} / {frames.length}
           </div>
           <button 
             type="button" 
             style={{ ...styles.button, ...styles.ghostButton }}
             onClick={() => setFilterUnlabeled((prev) => !prev)}
           >
             {filterUnlabeled ? "显示全部" : "只看未标注"}
           </button>
           <button 
             type="button" 
             style={styles.button}
             onClick={() => fetchData()}
           >
             刷新
           </button>
           <button 
             type="button" 
             style={{...styles.button, borderColor: '#111', color: '#111'}}
             onClick={exportDataset}
           >
             导出数据
           </button>
        </div>
      </header>

      {/* 2. Main Workspace: Canvas + Sidebar */}
      <div style={styles.mainWorkspace}>
        
        {/* Left: The Canvas (Flex Grow) */}
        <div style={styles.canvasArea}>
          {/* Constrain the cropper so it doesn't overflow */}
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <ImageCropper imageUrl={imageUrl} value={bbox} onChange={setBbox} />
          </div>
          
          {/* Floating Frame Tag */}
          <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            当前帧: {currentFrame ?? "-"}
          </div>
        </div>

        {/* Right: The Control Panel (Fixed Width) */}
        <aside style={styles.sidebar}>
          
          {/* Navigator Group */}
          <div>
            <div style={styles.sectionTitle}>导航</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" style={{ ...styles.button, flex: 1 }} onClick={handlePrev}>Prev</button>
              <button type="button" style={{ ...styles.button, flex: 1 }} onClick={handleNext}>Next</button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* Label Group */}
          <div>
            <div style={styles.sectionTitle}>分类标签</div>
            <div style={styles.labelGrid}>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <button
                  key={value}
                  type="button"
                  style={selectedLabel === value ? { ...styles.labelBtn, ...styles.activeLabelBtn } : styles.labelBtn}
                  onClick={() => setSelectedLabel(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Action Group */}
          <div style={{ marginTop: 'auto' }}>
            {bbox && (
              <div style={{ marginBottom: '12px', fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>
                 X:{Math.round(bbox.x)} Y:{Math.round(bbox.y)} W:{Math.round(bbox.width)} H:{Math.round(bbox.height)}
              </div>
            )}
            
            <button 
              type="button" 
              style={{ ...styles.button, ...styles.primaryButton, width: '100%', padding: '14px' }}
              onClick={submitLabel}
            >
              保存并下一张
            </button>
            
            {status && <div style={styles.statusText}>{status}</div>}
          </div>

        </aside>
      </div>

      {/* 3. Footer: Filmstrip (Thumbnails) */}
      <div style={styles.filmstripContainer}>
        {visibleFrames.map((name, idx) => {
          const labeled = frameMeta[name]?.labeled;
          const isActive = idx === currentIndex;
          const url = `${apiClient.defaults.baseURL}/api/videos/${sessionId}/frames/${name}`;
          
          return (
            <div 
              key={name} 
              onClick={() => setCurrentIndex(idx)}
              style={{ position: 'relative', display: 'inline-block' }}
            >
               <img 
                 src={url} 
                 alt={name} 
                 style={isActive ? { ...styles.thumb, ...styles.thumbActive } : styles.thumb}
               />
               {labeled && (
                 <div style={{
                   position: 'absolute', top: 4, right: 4, width: 8, height: 8, 
                   borderRadius: '50%', backgroundColor: '#0f6fff', border: '1px solid #fff'
                 }} />
               )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default LabelPage;