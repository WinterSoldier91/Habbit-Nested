import { useState, useEffect, useCallback } from 'react';

const useSound = (soundUrl: string, volume: number = 0.5) => {
  const [audio] = useState(new Audio(soundUrl));
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audio.volume = volume;

    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('ended', onEnded);
    };
  }, [audio, volume]);

  const play = useCallback(() => {
    audio.currentTime = 0;
    audio.play().catch(error => console.error("Audio play failed:", error));
    setIsPlaying(true);
  }, [audio]);

  return play;
};

export default useSound;
