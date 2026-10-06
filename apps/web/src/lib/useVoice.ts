import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack
} from "livekit-client";
import { api } from "./api";
import type {
  VoiceChannel,
  VoiceJoinResponse,
  VoiceParticipant
} from "../types";

function removeAttachedAudio(track: RemoteTrack): void {
  track.detach().forEach((element) => element.remove());
}

export function useVoice(enabled: boolean) {
  const [channels, setChannels] = useState<VoiceChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<VoiceChannel | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const roomRef = useRef<Room | null>(null);
  const speakingRef = useRef<Set<string>>(new Set());

  const syncParticipants = useCallback((room: Room) => {
    const all: Participant[] = [
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values())
    ];

    setParticipants(
      all.map((participant) => ({
        id: participant.identity,
        name: participant.name || "Kullanıcı",
        microphoneEnabled: participant.isMicrophoneEnabled,
        speaking: speakingRef.current.has(participant.identity)
      }))
    );
    setMicEnabled(room.localParticipant.isMicrophoneEnabled);
  }, []);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      await room.disconnect();
    }
    document
      .querySelectorAll<HTMLMediaElement>("[data-derdo-voice-audio='1']")
      .forEach((element) => element.remove());
    speakingRef.current = new Set();
    setParticipants([]);
    setCurrentChannel(null);
    setMicEnabled(false);
    setConnecting(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setChannels([]);
      void leave();
      return;
    }

    api<VoiceChannel[]>("/api/voice/channels")
      .then(setChannels)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Ses kanalları yüklenemedi");
      });

    return () => {
      void leave();
    };
  }, [enabled, leave]);

  const join = useCallback(
    async (channel: VoiceChannel) => {
      setConnecting(true);
      setError("");

      try {
        await leave();

        const joinInfo = await api<VoiceJoinResponse>(
          `/api/voice/channels/${channel.id}/token`,
          { method: "POST" }
        );

        const room = new Room();
        roomRef.current = room;

        const refresh = () => syncParticipants(room);

        room.on(RoomEvent.ParticipantConnected, refresh);
        room.on(RoomEvent.ParticipantDisconnected, refresh);
        room.on(RoomEvent.TrackMuted, refresh);
        room.on(RoomEvent.TrackUnmuted, refresh);

        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          speakingRef.current = new Set(speakers.map((participant) => participant.identity));
          syncParticipants(room);
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== Track.Kind.Audio) return;
          const element = track.attach();
          element.autoplay = true;
          element.dataset.derdoVoiceAudio = "1";
          document.body.appendChild(element);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            removeAttachedAudio(track);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (roomRef.current !== room) return;
          roomRef.current = null;
          speakingRef.current = new Set();
          setParticipants([]);
          setCurrentChannel(null);
          setMicEnabled(false);
        });

        await room.connect(joinInfo.url, joinInfo.token, {
          autoSubscribe: true
        });

        setCurrentChannel(channel);
        syncParticipants(room);

        await room.localParticipant.setMicrophoneEnabled(true);
        syncParticipants(room);
      } catch (err) {
        await leave();
        setError(err instanceof Error ? err.message : "Ses kanalına bağlanılamadı");
      } finally {
        setConnecting(false);
      }
    },
    [leave, syncParticipants]
  );

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const next = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      syncParticipants(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mikrofon değiştirilemedi");
    }
  }, [syncParticipants]);

  return {
    channels,
    currentChannel,
    participants,
    micEnabled,
    connecting,
    error,
    join,
    leave,
    toggleMicrophone
  };
}
