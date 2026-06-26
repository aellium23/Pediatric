'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

/**
 * Real LiveKit video room. Receives a server-issued access token (HS256 JWT
 * with a video grant) and the LiveKit server URL, connects, and renders the
 * full conference UI (participant grid, camera/mic controls, leave). Loaded via
 * next/dynamic with ssr:false — the LiveKit client is browser-only.
 */
export default function VideoRoom({
  url,
  token,
  onLeave,
}: {
  url: string;
  token: string;
  onLeave: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#000',
      }}
      data-lk-theme="default"
    >
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect
        video
        audio
        onDisconnected={onLeave}
        style={{ height: '100dvh' }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
