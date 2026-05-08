import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UseAudioPlayerOptions {
  onEnded?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

/**
 * Custom hook for managing audio playback state and controls.
 * Wraps the Web Audio API / HTMLAudioElement for use in ACE Step UI.
 */
export function useAudioPlayer(src: string | null, options: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { onEnded, onError, onTimeUpdate } = options;

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLoading: false,
    error: null,
  });

  // Initialize or update audio element when src changes
  useEffect(() => {
    if (!src) {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0, duration: 0 }));
      return;
    }

    const audio = new Audio(src);
    audioRef.current = audio;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleDurationChange = () =>
      setState(prev => ({ ...prev, duration: audio.duration || 0 }));
    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
      onTimeUpdate?.(audio.currentTime);
    };
    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      onEnded?.();
    };
    const handleError = () => {
      const msg = 'Failed to load audio source.';
      setState(prev => ({ ...prev, isLoading: false, error: msg, isPlaying: false }));
      onError?.(msg);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    } catch (err) {
      const msg = 'Playback failed. User interaction may be required.';
      setState(prev => ({ ...prev, error: msg }));
      onError?.(msg);
    }
  }, [onError]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    state.isPlaying ? pause() : play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
    setState(prev => ({ ...prev, currentTime: audioRef.current!.currentTime }));
  }, [state.duration]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = clamped;
    setState(prev => ({ ...prev, volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const next = !state.isMuted;
    audioRef.current.muted = next;
    setState(prev => ({ ...prev, isMuted: next }));
  }, [state.isMuted]);

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    toggleMute,
    audioRef,
  };
}
