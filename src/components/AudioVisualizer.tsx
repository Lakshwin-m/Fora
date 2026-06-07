import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { AudioVisualizer as ReactAudioVisualizer } from 'react-audio-visualize';

interface AudioVisualizerProps {
  url: string;
  altText?: string;
  className?: string;
}

export const AudioVisualizer = ({ url, altText, className }: AudioVisualizerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [blob, setBlob] = useState<Blob | undefined>();

  useEffect(() => {
    fetch(url)
      .then(res => res.blob())
      .then(b => setBlob(b))
      .catch(err => console.error("Failed to load audio blob", err));
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    let animationFrameId: number;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      animationFrameId = requestAnimationFrame(updateTime);
    };

    const onPlay = () => {
      animationFrameId = requestAnimationFrame(updateTime);
    };

    const onPause = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.currentTime);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
    
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('seeked', () => setCurrentTime(audio.currentTime));
    
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('seeked', () => setCurrentTime(audio.currentTime));
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [blob]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => console.error("Playback failed", err));
      }
    }
  };

  return (
    <div className={`w-full p-6 bg-[#F8F8F8] flex flex-col items-center cursor-pointer group relative ${className ?? ""}`} onClick={togglePlay}>
      <audio 
        ref={audioRef} 
        src={url} 
        crossOrigin="anonymous" 
      />
      
      <div className="w-16 h-16 bg-white shadow-sm border border-[#E8E8E8] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform z-10 relative mb-6">
        {isPlaying ? <Pause className="w-6 h-6 text-[#1A1A1A]" /> : <Play className="w-6 h-6 text-[#1A1A1A] ml-1" />}
      </div>
      
      <div className="w-full max-w-[300px] h-[60px] flex items-center justify-center relative pointer-events-none">
        {blob ? (
          <ReactAudioVisualizer
            ref={visualizerRef}
            blob={blob}
            width={300}
            height={60}
            barWidth={3}
            gap={2}
            barColor={'#FFDCCC'}
            barPlayedColor={'#FB6376'}
            currentTime={currentTime}
          />
        ) : (
          <div className="w-full h-[3px] bg-[#FFDCCC] rounded-full" />
        )}
      </div>
      
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#999] mt-4 z-10">
        {isPlaying ? 'PLAYING...' : 'VOICE NOTE'}
      </span>
    </div>
  );
};
