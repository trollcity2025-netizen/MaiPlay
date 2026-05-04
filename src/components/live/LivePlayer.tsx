import { useEffect, useRef, useState } from 'react'
import { MuxPlayer } from '../video/MuxPlayer'
import { supabase } from '../../lib/supabase'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

interface LivePlayerProps {
  session: {
    id: string
    title?: string | null
    mux_live_playback_id: string | null
    agora_channel: string | null
    status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  }
  isHost?: boolean
  onHostJoined?: () => void
  onHostLeft?: () => void
}

export function LivePlayer({ session, isHost = false, onHostJoined, onHostLeft }: LivePlayerProps) {
  const { account } = useAuthAccount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [agoraClient, setAgoraClient] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<any>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [hostVideoTrack, setHostVideoTrack] = useState<any>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)
  const hostVideoRef = useRef<HTMLVideoElement>(null)

  // Initialize Agora client
  useEffect(() => {
    if (!session.agora_channel) return

    const initAgora = async () => {
      try {
        // Dynamically import Agora SDK
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

        const client = AgoraRTC.createClient({
          mode: isHost ? 'live' : 'rtc',
          codec: 'vp8'
        })

        if (isHost) {
          // Set client role to host for broadcasting
          await client.setClientRole('host')
        }

        // Set up event handlers
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType)
          if (mediaType === 'video') {
            setHostVideoTrack(user.videoTrack)
            user.videoTrack?.play(hostVideoRef.current!)
            onHostJoined?.()
          }
        })

        client.on('user-unpublished', (_user, mediaType) => {
          if (mediaType === 'video') {
            setHostVideoTrack(null)
            onHostLeft?.()
          }
        })

        client.on('user-left', () => {
          setHostVideoTrack(null)
          onHostLeft?.()
        })

        client.on('connection-state-change', (curState, _prevState) => {
          console.log('Agora connection state changed:', curState)
          setIsConnected(curState === 'CONNECTED')
          if (curState !== 'CONNECTED') {
            setIsPublishing(false)
          }
        })

        setAgoraClient(client)
      } catch (error) {
        console.error('Failed to initialize Agora:', error)
      }
    }

    initAgora()

    return () => {
      if (agoraClient) {
        agoraClient.leave()
        setAgoraClient(null)
      }
      if (localVideoTrack) {
        localVideoTrack.close()
        setLocalVideoTrack(null)
      }
      if (localAudioTrack) {
        localAudioTrack.close()
        setLocalAudioTrack(null)
      }
    }
  }, [isHost, session.agora_channel, onHostJoined, onHostLeft])

   // Join Agora channel
   const joinChannel = async () => {
     if (!agoraClient || !session.agora_channel) return

     try {
       const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID

       // Generate Agora token
       const tokenResponse = await supabase.functions.invoke('generate-agora-token', {
         body: {
           channelName: session.agora_channel,
           uid: isHost ? account?.id : null
         }
       })

       if (tokenResponse.error) {
         throw new Error(`Failed to generate Agora token: ${tokenResponse.error.message}`)
       }

       const token = tokenResponse.data.token

       if (isHost) {
         // Host joins with their user ID
         await agoraClient.join(AGORA_APP_ID, session.agora_channel, token, account?.id)
       } else {
         // Audience joins anonymously
         await agoraClient.join(AGORA_APP_ID, session.agora_channel, token, null)
       }
       setIsConnected(true)
       console.log(`Joined Agora channel as ${isHost ? 'host' : 'audience'}`)

       if (isHost) {
         // Update session status to live
         const { error: updateError } = await supabase
           .from('creator_live_sessions')
           .update({
             status: 'live',
             started_at: new Date().toISOString()
           })
           .eq('id', session.id)

         if (updateError) {
           console.error('Failed to update session status:', updateError)
         }
       }
     } catch (error) {
       console.error('Failed to join Agora channel:', error)
       setIsConnected(false)
     }
   }

  // Start camera and mic for host
  const startLocalStream = async () => {
    if (!isHost || !agoraClient) return

    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

      const mic = await AgoraRTC.createMicrophoneAudioTrack()
      const cam = await AgoraRTC.createCameraVideoTrack()

      setLocalAudioTrack(mic)
      setLocalVideoTrack(cam)

      // Play local video in the container
      if (localVideoRef.current) {
        cam.play(localVideoRef.current)
      }

      console.log('Local camera and mic started')
    } catch (error) {
      console.error('Failed to start local stream:', error)
    }
  }

  // Publish local stream
  const publishStream = async () => {
    if (!agoraClient || !localVideoTrack || !localAudioTrack || !isConnected) {
      console.warn('Cannot publish - missing requirements or not connected')
      return
    }

    // Double-check Agora connection state
    if (agoraClient.connectionState !== 'CONNECTED') {
      console.warn('Agora client not connected, current state:', agoraClient.connectionState)
      return
    }

    try {
      await agoraClient.publish([localVideoTrack, localAudioTrack])
      setIsPublishing(true)
      console.log('Stream published successfully')
    } catch (error) {
      console.error('Failed to publish stream:', error)
      setIsPublishing(false)
    }
  }

  // Control functions
  const toggleCamera = async () => {
    if (!localVideoTrack) return

    try {
      if (cameraEnabled) {
        await localVideoTrack.setEnabled(false)
      } else {
        await localVideoTrack.setEnabled(true)
      }
      setCameraEnabled(!cameraEnabled)
    } catch (error) {
      console.error('Failed to toggle camera:', error)
    }
  }

  const toggleMic = async () => {
    if (!localAudioTrack) return

    try {
      if (micEnabled) {
        await localAudioTrack.setEnabled(false)
      } else {
        await localAudioTrack.setEnabled(true)
      }
      setMicEnabled(!micEnabled)
    } catch (error) {
      console.error('Failed to toggle mic:', error)
    }
  }

  const endStream = async () => {
    try {
      // Leave Agora channel first
      if (agoraClient) {
        await agoraClient.leave()
        setIsConnected(false)
        setIsPublishing(false)
      }

      // Stop local tracks
      if (localVideoTrack) {
        localVideoTrack.close()
        setLocalVideoTrack(null)
      }

      if (localAudioTrack) {
        localAudioTrack.close()
        setLocalAudioTrack(null)
      }

      // Update session status to ended
      const { error: updateError } = await supabase
        .from('creator_live_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (updateError) {
        console.error('Failed to update session status:', updateError)
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['live-session'] })
      queryClient.invalidateQueries({ queryKey: ['creator-live-sessions'] })

      navigate('/creator-hub')
    } catch (error) {
      console.error('Failed to end stream:', error)
    }
  }

  useEffect(() => {
    if (agoraClient && session.status === 'live') {
      if (isHost && !isConnected) {
        joinChannel()
      } else if (!isHost && !isConnected) {
        joinChannel()
      }
    }
  }, [agoraClient, session.status, isHost, isConnected])

  if (session.status !== 'live') {
    return (
      <div className="aspect-video bg-black rounded-xl flex items-center justify-center border border-yellow-400/30">
        <div className="text-center text-white">
          <div className="text-2xl mb-2">🔴</div>
          <p className="text-lg font-semibold">
            {session.status === 'scheduled' ? 'Stream Starting Soon' :
             session.status === 'ended' ? 'Stream Ended' : 'Stream Cancelled'}
          </p>
          <p className="text-sm text-gray-400 mt-2">{session.title ?? 'Untitled Live'}</p>
        </div>
      </div>
    )
  }

  if (isHost) {
    // Host view - show local camera feed
    return (
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-yellow-400/30">
        {/* Local video feed */}
        <div
          ref={localVideoRef}
          className="absolute inset-0 w-full h-full bg-gray-900 flex items-center justify-center"
        >
          {!localVideoTrack && (
            <div className="text-center text-white">
              <div className="text-4xl mb-2">📹</div>
              <p className="text-lg">Camera Preview</p>
              <p className="text-sm text-gray-400 mt-2">Click "Start Camera" to begin</p>
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-medium">LIVE</span>
        </div>

        {/* Connection status */}
        <div className="absolute top-4 right-4 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
          {isPublishing ? '🟢 Publishing' : isConnected ? '🟡 Connected' : '🔴 Disconnected'}
        </div>

        {/* Host controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-4">
          {!isConnected && (
            <button
              onClick={joinChannel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
            >
              Join Channel
            </button>
          )}

          {isConnected && !localVideoTrack && (
            <button
              onClick={startLocalStream}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold"
            >
              Start Camera & Mic
            </button>
          )}

          {isConnected && localVideoTrack && !isPublishing && (
            <button
              onClick={publishStream}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
            >
              Go Live!
            </button>
          )}

          {isPublishing && (
            <div className="flex gap-2">
              <button
                onClick={toggleCamera}
                className={`px-3 py-2 rounded font-bold ${cameraEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
              >
                {cameraEnabled ? '📹' : '📷'}
              </button>
              <button
                onClick={toggleMic}
                className={`px-3 py-2 rounded font-bold ${micEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
              >
                {micEnabled ? '🎤' : '🔇'}
              </button>
              <button
                onClick={endStream}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
              >
                End Live
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Viewer view - show Mux stream or Agora composited view
  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-yellow-400/30">
      {/* Main Mux playback */}
      {session.mux_live_playback_id && (
        <MuxPlayer
          playbackId={session.mux_live_playback_id}
          videoId={session.id}
          autoplay
          muted={false}
          controls={false}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Host video compositing overlay */}
      {hostVideoTrack && (
        <video
          ref={hostVideoRef}
          className="absolute top-4 right-4 w-48 h-36 rounded-lg border-2 border-white/20 bg-black"
          autoPlay
          playsInline
          muted
        />
      )}

      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-white text-sm font-medium">LIVE</span>
      </div>

      {/* Connection status */}
      <div className="absolute bottom-4 right-4 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
    </div>
  )
}