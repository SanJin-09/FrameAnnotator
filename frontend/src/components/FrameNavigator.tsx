type Props = {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
};

function FrameNavigator({ currentIndex, total, onPrev, onNext }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <button type="button" onClick={onPrev} disabled={currentIndex <= 0}>
        上一张
      </button>
      <span>
        {total === 0 ? "暂无帧" : `第 ${currentIndex + 1} / ${total} 张`}
      </span>
      <button type="button" onClick={onNext} disabled={currentIndex >= total - 1}>
        下一张
      </button>
    </div>
  );
}

export default FrameNavigator;
