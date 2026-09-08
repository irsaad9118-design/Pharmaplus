import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition type declarations for Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseVoiceSearchOptions {
  onTranscript?: (transcript: string) => void;
  lang?: string;
  continuous?: boolean;
}

export const useVoiceSearch = (options: UseVoiceSearchOptions = {}) => {
  const { onTranscript, lang = 'en-IN', continuous = false } = options;
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep onTranscript callback reference up to date without re-running effects
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindow;
      const hasSupport = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
      setIsSupported(hasSupport);
    }
  }, []);

  // Stop and cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError('Voice recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setError(null);
    setTranscript('');

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = lang || (typeof navigator !== 'undefined' && navigator.language) || 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          setTranscript(currentText);
          if (onTranscriptRef.current) {
            onTranscriptRef.current(currentText);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') {
          // Normal abortion when user stops or unmounts
          setIsListening(false);
          return;
        }

        console.warn('Voice Speech Recognition Notice:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please click the mic and speak clearly.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone hardware found. Please connect an audio input.');
        } else if (event.error === 'network') {
          setError('Network error encountered during voice recognition.');
        } else {
          setError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start SpeechRecognition:', err);
      setIsListening(false);
      setError('Could not activate microphone. Please check permissions and reload.');
    }
  }, [continuous, lang]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearError
  };
};
