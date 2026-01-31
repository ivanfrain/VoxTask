
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { taskService } from '../services/taskService';
import { TaskStatus } from '../types';

interface VoiceAssistantProps {
  onTaskCreated: () => void;
}

// Audio utility functions
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
      title: { type: Type.STRING, description: 'The title of the task.' },
      description: { type: Type.STRING, description: 'Detailed description of the task.' },
      deadline: { type: Type.STRING, description: 'Deadline in YYYY-MM-DD format.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags associated with the task.' },
      status: { type: Type.STRING, enum: Object.values(TaskStatus), description: 'Initial status of the task.' }
    },
    required: ['title']
  },
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onTaskCreated }) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('How can I help you?');
  const [transcript, setTranscript] = useState('');

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const toggleAssistant = async () => {
    if (isActive) {
      handleClose();
    } else {
      setIsActive(true);
      await startAssistant();
    }
  };

  const handleClose = () => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
    }
    setIsActive(false);
    setIsListening(false);
    setStatusMessage('How can I help you?');
  };

  const startAssistant = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsListening(true);
            setStatusMessage('Listening...');
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
               setTranscript(prev => prev + ' ' + message.serverContent?.outputTranscription?.text);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'create_task') {
                  const result = await taskService.createTask({
                    title: fc.args.title as string,
                    description: (fc.args.description as string) || '',
                    deadline: (fc.args.deadline as string) || new Date().toISOString().split('T')[0],
                    tags: (fc.args.tags as string[]) || [],
                    status: (fc.args.status as TaskStatus) || TaskStatus.TODO,
                  });
                  onTaskCreated();
                  setStatusMessage(`Task "${fc.args.title}" created!`);
                  
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Task created successfully." },
                      }
                    });
                  });
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioContextRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
          },
          onerror: (e) => {
            console.error('Gemini error:', e);
            setStatusMessage('Connection error.');
          },
          onclose: () => {
            setIsListening(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [createTaskFunctionDeclaration] }],
          systemInstruction: 'You are a task management assistant. Users will speak to you to create tasks. Extract the task title, description, deadline, tags, and status from their voice. Call the create_task function once you have the information. Be helpful and brief in your audio responses.',
          outputAudioTranscription: {},
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start assistant:', err);
      setStatusMessage('Access denied.');
      setIsActive(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={toggleAssistant}
        className={`fixed bottom-6 left-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all z-50 ${isActive ? 'bg-red-500 scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        <div className="relative">
          {isActive && (
            <span className="absolute -inset-4 rounded-full border-2 border-white/30 animate-ping"></span>
          )}
          <i className={`fa-solid ${isActive ? 'fa-microphone-slash' : 'fa-microphone'} text-2xl text-white`}></i>
        </div>
      </button>

      {/* Assistant Modal Overlay */}
      {isActive && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 transition-all animate-in fade-in">
          <button 
            onClick={handleClose}
            className="absolute top-8 right-8 text-white/60 hover:text-white p-3 text-2xl"
          >
            <i className="fa-solid fa-times"></i>
          </button>

          <div className="flex flex-col items-center gap-10 max-w-lg w-full text-center">
            {/* Pulsing Visualizer */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-40 h-40 bg-blue-500/20 rounded-full animate-pulse"></div>
              <div className="absolute w-32 h-32 bg-blue-500/40 rounded-full animate-pulse delay-75"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                <i className="fa-solid fa-waveform text-white text-3xl"></i>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">{statusMessage}</h2>
              <p className="text-blue-100/70 text-lg leading-relaxed">
                "Create a task called 'Buy Groceries' with tag 'Home' for tomorrow."
              </p>
            </div>

            {transcript && (
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Transcribed Live</p>
                <p className="text-white/80 italic line-clamp-3 leading-relaxed">"{transcript.trim()}..."</p>
              </div>
            )}
            
            <button 
              onClick={handleClose}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 font-medium"
            >
              Done Talking
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
