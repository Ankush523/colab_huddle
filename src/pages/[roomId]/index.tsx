import ChatBox from "@/component/ChatBox/ChatBox";
import RemotePeer from "@/component/RemotePeer/RemotePeer";
import { TPeerMetadata } from "@/utils/types";
import Editor from '@monaco-editor/react';

import {
  useLocalAudio,
  useLocalPeer,
  useLocalScreenShare,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

type Props = {
  token: string;
};

export default function Home({ token }: Props) {
  const [displayName, setDisplayName] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const { joinRoom, state } = useRoom({
    onJoin: (room) => {
      console.log("onJoin", room);
      updateMetadata({ displayName });
    },
    onPeerJoin: (peer) => {
      console.log("onPeerJoin", peer);
    },
  });
  const { enableVideo, isVideoOn, stream, disableVideo } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();
  const { startScreenShare, stopScreenShare, shareStream } =
    useLocalScreenShare();
  const { updateMetadata } = useLocalPeer<TPeerMetadata>();
  const { peerIds } = usePeerIds();

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (shareStream && screenRef.current) {
      screenRef.current.srcObject = shareStream;
    }
  }, [shareStream]);

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 ${inter.className}`}>
      <div className="flex flex-row w-full h-full">
        {/* Left Side */}
        <div className="flex flex-col w-1/2 p-4">
          <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
            <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
              <code className="font-mono font-bold">{state}</code>
            </p>
            <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
              {state === "idle" && (
                <>
                  <input
                    disabled={state !== "idle"}
                    placeholder="Display Name"
                    type="text"
                    className="border-2 border-blue-400 rounded-lg p-2 mx-2 bg-black text-white"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                  <button
                    disabled={!displayName}
                    type="button"
                    className="bg-purple-700 p-2 mx-2 rounded-lg"
                    onClick={async () => {
                      await joinRoom({
                        roomId: router.query.roomId as string,
                        token,
                      });
                    }}
                  >
                    Join Room
                  </button>
                </>
              )}
              {state === "connected" && (
                <>
                  <button
                    type="button"
                    className="bg-purple-700 p-2 mx-2 rounded-lg"
                    onClick={async () => {
                      isVideoOn ? await disableVideo() : await enableVideo();
                    }}
                  >
                    {isVideoOn ? "Disable Video" : "Enable Video"}
                  </button>
                  <button
                    type="button"
                    className="bg-purple-700 p-2 mx-2 rounded-lg"
                    onClick={async () => {
                      isAudioOn ? await disableAudio() : await enableAudio();
                    }}
                  >
                    {isAudioOn ? "Disable Audio" : "Enable Audio"}
                  </button>
                  <button
                    type="button"
                    className="bg-purple-700 p-2 mx-2 rounded-lg"
                    onClick={async () => {
                      shareStream
                        ? await stopScreenShare()
                        : await startScreenShare();
                    }}
                  >
                    {shareStream ? "Disable Screen" : "Enable Screen"}
                  </button>
                  <button
                    type="button"
                    className="bg-purple-700 p-2 mx-2 rounded-lg"
                    onClick={async () => {
                      const status = isRecording
                        ? await fetch(
                            `/api/stopRecording?roomId=${router.query.roomId}`
                          )
                        : await fetch(
                            `/api/startRecording?roomId=${router.query.roomId}`
                          );

                      const data = await status.json();
                      console.log({ data });
                      setIsRecording(!isRecording);
                    }}
                  >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-8 grid gap-2 text-center lg:max-w-5xl lg:w-full lg:grid-cols-4 lg:text-left">
            {peerIds.map((peerId: any) =>
              peerId ? <RemotePeer key={peerId} peerId={peerId} /> : null
            )}
          </div>
          {isVideoOn && (
            <div className="w-full mx-auto border-2 rounded-xl border-blue-400 mt-4">
              <video ref={videoRef} className="aspect-video rounded-xl" autoPlay muted />
            </div>
          )}
          {shareStream && (
            <div className="w-full mx-auto border-2 rounded-xl border-blue-400 mt-4">
              <video ref={screenRef} className="aspect-video rounded-xl" autoPlay muted />
            </div>
          )}
          {state === "connected" && <ChatBox />}
        </div>

        {/* Right Side */}
        <div className="w-1/2 p-4">
          <Editor height="90vh" defaultLanguage="javascript" defaultValue="console.log('Hello World')" />
        </div>
      </div>
    </main>
  );
}

import { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { AccessToken, Role } = await import("@huddle01/server-sdk/auth");

  const accessToken = new AccessToken({
    apiKey: "dqwg1L7ombeVA_WdaBrLD5zuGTGgLwkk",
    roomId: ctx.params?.roomId?.toString() || "",
    role: Role.HOST,
    permissions: {
      admin: true,
      canConsume: true,
      canProduce: true,
      canProduceSources: {
        cam: true,
        mic: true,
        screen: true,
      },
      canRecvData: true,
      canSendData: true,
      canUpdateMetadata: true,
    },
  });

  const token = await accessToken.toJwt();

  return {
    props: { token },
  };
};
