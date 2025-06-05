import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "environment", // Uses rear camera
};

export default function CameraCapture({ onCapture, onClose }) {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    onCapture(imageSrc);
    setIsCameraOn(false);
  };

  const retake = () => {
    setCapturedImage(null);
    setIsCameraOn(true);
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-50 rounded-lg">
      {isCameraOn ? (
        <>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="rounded-lg border-2 border-gray-300"
          />
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="bg-red-500 text-white py-2 px-6 rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
            <button
              onClick={capture}
              className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition"
            >
              Capture
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="rounded-lg border-2 border-gray-300 max-w-full"
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1">
              <button onClick={retake}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={retake}
              className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition"
            >
              Retake
            </button>
            <button
              onClick={() => onClose(capturedImage)}
              className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition"
            >
              Use Photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}