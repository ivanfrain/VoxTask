
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { taskService } from '../services/taskService';
import { TaskStatus } from '../types';

interface VoiceAssistantProps {
  onTaskCreated: () => void;
}

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

  const startAssistant = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatusMessage('Listening...');
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                await taskService.createTask({
                  title: fc.args.title as string,
                  description: (fc.args.description as string) || '',
                  deadline: (fc.args.deadline as string) || new Date().toISOString().split('T')[0],
                  tags: (fc.args.tags as string[]) || [],
                  status: (fc.args.status as TaskStatus) || TaskStatus.TODO,
                });
                onTaskCreated();
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Success" } } }));
              }
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [createTaskFunctionDeclaration] }],
          systemInstruction: 'Extract task info and call create_task.',
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setIsActive(false);
    }
  };

  return (
    <button onClick={() => { if(!isActive) startAssistant(); setIsActive(!isActive); }} className={`fixed bottom-6 left-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-50 ${isActive ? 'bg-red-500' : 'bg-blue-600'}`}>
      <i className={`fa-solid ${isActive ? 'fa-microphone-slash' : 'fa-microphone'} text-2xl text-white`}></i>
    </button>
  );
};

export default VoiceAssistant;
