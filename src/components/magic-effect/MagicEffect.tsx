import "./magic-effect.scss";

export default function MagicEffect({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="magic-effect-container">
      <img src={imageUrl} alt="edited" className="edited-image" />
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
      <span className="spark"></span>
    </div>
  );
}
