import React, { useState, useRef, useEffect } from 'react';

interface MiniAudioPlayerProps {
  audioUrl: string;
  label?: string;
  disabled?: boolean; // For editor mode - disables audio playback
}

const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ audioUrl, label, disabled = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (disabled) {
      // In disabled mode, just set some default values
      setDuration(120); // Default 2 minutes for display
      setIsLoading(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.pause();
    };
  }, [audioUrl, disabled]);

  const togglePlayPause = () => {
    if (disabled) return; // Don't allow playback in editor mode
    
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Stop all other audio elements
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(el => {
        if (el !== audio && !el.paused) {
          el.pause();
        }
      });

      audio.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return; // Don't allow scrubbing in editor mode
    
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const newTime = (clickX / progressWidth) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border-2 border-purple-400 rounded-lg p-3 shadow-lg min-w-48">
      <div className="flex items-center space-x-3">
        <button
          onClick={togglePlayPause}
          disabled={isLoading || disabled}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all ${
            isLoading || disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : isPlaying 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-purple-500 hover:bg-purple-600'
          }`}
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <div className="flex space-x-1">
              <div className="w-1 h-3 bg-white"></div>
              <div className="w-1 h-3 bg-white"></div>
            </div>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <div className="flex-1">
          <div 
            className="h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      
      {label && (
        <div className="text-xs text-gray-500 mt-2 truncate">
          {label}
        </div>
      )}
    </div>
  );
};

export default MiniAudioPlayer;