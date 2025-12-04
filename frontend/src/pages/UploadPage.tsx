import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiClient from "../api/client";

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fps, setFps] = useState<number>(2);
  const [status, setStatus] = useState<string>("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus("请选择要上传的 mp4 文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fps", fps.toString());

    try {
      const { data } = await apiClient.post("/api/videos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("上传成功，跳转到标注页面");
      navigate(`/label/${data.session_id}`);
    } catch (error) {
      console.error(error);
      setStatus("上传失败，请检查后端服务是否已启动");
    }
  };

  return (
    <main style={{ margin: "2rem auto", maxWidth: 600 }}>
      <h1>视频抽帧与标注</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <label>
          视频文件 (mp4)
          <input
            type="file"
            accept="video/mp4"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          抽帧 FPS
          <input
            type="number"
            min={1}
            value={fps}
            onChange={(event) => setFps(parseInt(event.target.value, 10) || 1)}
          />
        </label>

        <button type="submit">开始抽帧</button>
      </form>
      {status && <p>{status}</p>}
    </main>
  );
}

export default UploadPage;
