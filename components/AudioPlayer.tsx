import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <span className="text-red-600 text-sm">오디오 파일을 로드할 수 없습니다</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isLoading 
            ? 'bg-gray-200 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center space-x-2">
        <span className="text-xs text-gray-500 w-10">
          {isLoading ? '--:--' : formatTime(currentTime)}
        </span>
        
        <input
          type="range"
          min="0"
          max="100"
          value={duration > 0 ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          disabled={isLoading}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #e5e7eb ${duration > 0 ? (currentTime / duration) * 100 : 0}%, #e5e7eb 100%)`
          }}
        />
        
        <span className="text-xs text-gray-500 w-10">
          {isLoading ? '--:--' : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;