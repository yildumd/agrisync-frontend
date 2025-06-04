// components/CameraCapture.jsx
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const videoConstraints = {
  width: 400,
  height: 300,
  facingMode: "environment",
};

export default function CameraCapture({ onCapture }) {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    onCapture(imageSrc);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="rounded border"
      />
      <button
        onClick={capture}
        className="bg-green-600 text-white py-1 px-4 rounded hover:bg-green-700"
      >
        Snap Photo
      </button>
      {capturedImage && (
        <img src={capturedImage} alt="Captured" className="mt-2 max-w-full rounded" />
      )}
    </div>
  );
}
