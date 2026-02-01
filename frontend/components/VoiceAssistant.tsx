
import React, { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { taskService } from '../services/taskService';
import { TaskStatus } from '../types';

interface VoiceAssistantProps {
  onTaskCreated: () => void;
}

// Decode base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encode Uint8Array to base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Fix: Proper PCM audio decoding for raw streams
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const createTaskFunctionDeclaration: FunctionDeclaration = {
  name: 'create_task',
  parameters: {
    type: Type.OBJECT,
    description: 'Creates a new task in the todo list.',
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      deadline: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      status: { type: Type.STRING, enum: Object.values(TaskStatus) }
    },
    required: ['title']
  },
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onTaskCreated }) => {
  const [isActive, setIsActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('How can I help you?');
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Fix: Helper to cleanly stop the assistant and contexts
  const stopAssistant = () => {
    if (sessionRef.current) {
      sessionRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      for (const source of sourcesRef.current) {
        try { source.stop(); } catch(e) {}
      }
      sourcesRef.current.clear();
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setIsActive(false);
    setStatusMessage('How can I help you?');
  };

  const startAssistant = async () => {
    try {
      // Fix: Use correct initialization as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatusMessage('Listening...');
            if (!inputAudioContextRef.current) return;
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              // Fix: Use sessionPromise.then to send input to avoid race conditions
              sessionPromise.then(session => {
                if (session) {
                  session.sendRealtimeInput({ 
                    media: { 
                      data: encode(new Uint8Array(int16.buffer)), 
                      mimeType: 'audio/pcm;rate=16000' 
                    } 
                  });
                }
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: Implement audio playback of model responses
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Fix: Handle model interruption signal
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                try { source.stop(); } catch(e) {}
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle function calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                try {
                  await taskService.createTask({
                    title: fc.args.title as string,
                    description: (fc.args.description as string) || '',
                    deadline: (fc.args.deadline as string) || new Date().toISOString().split('T')[0],
                    tags: (fc.args.tags as string[]) || [],
                    status: (fc.args.status as TaskStatus) || TaskStatus.TODO,
                  });
                  onTaskCreated();
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Task created successfully" } } 
                  }));
                } catch (err) {
                  sessionPromise.then(s => s.sendToolResponse({ 
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Failed to create task" } } 
                  }));
                }
              }
            }
          },
          // Fix: Required error and close handlers
          onerror: (e: ErrorEvent) => {
            console.error('Voice Assistant Error:', e);
            stopAssistant();
          },
          onclose: (e: CloseEvent) => {
            stopAssistant();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [createTaskFunctionDeclaration] }],
          systemInstruction: 'You are a professional task management assistant. Use the create_task tool to help the user manage their todo list. Keep your spoken responses short and confirming.',
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        }
      });
      sessionRef.current = await sessionPromise;
      setIsActive(true);
    } catch (err) {
      console.error('Failed to initialize Voice Assistant:', err);
      stopAssistant();
    }
  };

  const handleToggle = () => {
    if (isActive) {
      stopAssistant();
    } else {
      startAssistant();
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      className={`fixed bottom-6 left-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-50 transition-all active:scale-95 ${isActive ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
    >
      <i className={`fa-solid ${isActive ? 'fa-microphone-slash' : 'fa-microphone'} text-2xl text-white`}></i>
    </button>
  );
};

export default VoiceAssistant;
