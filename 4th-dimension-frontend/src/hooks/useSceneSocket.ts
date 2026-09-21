'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface RemoteTimeScrub {
  senderId: string;
  time: number;
  hyperplaneAngles?: Record<string, number>;
}

export function useSceneSocket(sceneId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [activeViewers, setActiveViewers] = useState<number>(1);
  const [connected, setConnected] = useState<boolean>(false);
  const [remoteScrub, setRemoteScrub] = useState<RemoteTimeScrub | null>(null);

  useEffect(() => {
    if (!sceneId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const socket = io(`${BACKEND_WS_URL}/scenes`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinScene', { sceneId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('viewerCountUpdated', (data: { sceneId: string; activeViewers: number }) => {
      if (data.sceneId === sceneId) {
        setActiveViewers(data.activeViewers);
      }
    });

    socket.on('timeScrubbed', (data: RemoteTimeScrub) => {
      setRemoteScrub(data);
    });

    return () => {
      socket.emit('leaveScene', { sceneId });
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [sceneId]);

  const sendTimeScrub = useCallback(
    (time: number, hyperplaneAngles?: Record<string, number>) => {
      if (socketRef.current && connected && sceneId) {
        socketRef.current.emit('timeScrub', {
          sceneId,
          time,
          hyperplaneAngles,
        });
      }
    },
    [connected, sceneId],
  );

  return {
    connected,
    activeViewers,
    remoteScrub,
    sendTimeScrub,
  };
}
