import { useState, useEffect } from "react";
import "./magic-effect.scss";

export default function MagicEffect({ imageUrl }: { imageUrl: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div className={`magic-effect-container ${show ? "show" : ""}`}>
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
