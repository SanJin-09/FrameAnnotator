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
    <div className="page">
      <div className="shell">
        <div className="panel glass card-padding">
          <h1 className="serif">Frame Annotator</h1>
          <p className="heading-sub">监控视频抽帧与人头姿态标注工具</p>
        </div>

        <div className="panel card-padding">
          <form className="layout" onSubmit={handleSubmit}>
            <div className="grid-two">
              <label className="field">
                <span className="section-title">视频文件 (mp4)</span>
                <input
                  className="input"
                  type="file"
                  accept="video/mp4"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label className="field">
                <span className="section-title">抽帧 FPS</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={fps}
                  onChange={(event) => setFps(parseInt(event.target.value, 10) || 1)}
                />
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="soft-button primary">
                开始抽帧
              </button>
              <div className="status">{status}</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
