import SpeechRecognition, { useSpeechRecognition as useSpeechLib } from 'react-speech-recognition';
import { useState } from 'react';

export default function useVoiceRecorder() {
  const [message, setMessage] = useState('');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechLib();

  // your logic here

  return { message, transcript, listening };
}
