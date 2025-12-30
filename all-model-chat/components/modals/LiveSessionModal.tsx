
import React from 'react';
import { Modal } from '../shared/Modal';
import { Mic, MicOff, PhoneOff, AlertCircle, Loader2, Video, VideoOff, MonitorUp } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AppSettings } from '../../types';

interface LiveSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    appSettings: AppSettings;
    modelId: string;
}

export const LiveSessionModal: React.FC<LiveSessionModalProps> = ({ isOpen, onClose, appSettings, modelId }) => {
    const { 
        isConnected, 
        isSpeaking, 
        isMuted,
        toggleMute,
        error, 
        volume, 
        disconnect,
        videoStream,
        videoSource,
        startCamera,
        startScreenShare,
        stopVideo,
        videoRef
    } = useLiveAPI({
        appSettings,
        modelId,
        onClose
    });

    const toggleCamera = () => {
        if (videoSource === 'camera') {
            stopVideo();
        } else {
            startCamera();
        }
    };

    const toggleScreen = () => {
        if (videoSource === 'screen') {
            stopVideo();
        } else {
            startScreenShare();
        }
    };

    // Visualizer scale
    const scale = 1 + Math.min(volume * 5, 1.5);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={disconnect}
            backdropClassName="bg-black/95 backdrop-blur-md"
            contentClassName="w-full h-full flex flex-col items-center justify-center text-white relative overflow-hidden"
            noPadding
        >
            {/* Background / Video Layer */}
            {videoStream && (
                <div className="absolute inset-0 z-0">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`w-full h-full object-cover opacity-60 ${videoSource === 'screen' ? 'object-contain' : 'object-cover'}`}
                    />
                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"></div>
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300 w-full max-w-lg px-4">
                {error ? (
                    <div className="flex flex-col items-center gap-4 text-red-400 bg-black/50 p-8 rounded-3xl border border-red-500/30 backdrop-blur-md">
                        <AlertCircle size={48} />
                        <p className="text-lg font-medium text-center">{error}</p>
                        <button onClick={disconnect} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Status Indicator */}
                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-2xl font-light tracking-wide opacity-90 drop-shadow-md">
                                {isConnected ? (isSpeaking ? "Gemini is speaking..." : (isMuted ? "Mic Muted" : "Listening...")) : "Connecting..."}
                            </h2>
                            <p className="text-sm opacity-60 font-mono bg-black/20 px-2 py-1 rounded backdrop-blur-sm">{modelId}</p>
                        </div>

                        {/* Orb Visualizer - Centered */}
                        <div className="relative w-64 h-64 flex items-center justify-center my-4">
                            {/* Outer Glow */}
                            <div 
                                className={`absolute inset-0 rounded-full blur-3xl transition-all duration-200 ${isSpeaking ? 'bg-blue-500/40' : (isMuted ? 'bg-red-500/20' : 'bg-purple-500/30')}`}
                                style={{ transform: `scale(${isSpeaking ? 1.2 : scale})` }}
                            />
                            
                            {/* Core Orb */}
                            <div 
                                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_0_50px_rgba(255,255,255,0.3)] backdrop-blur-sm border border-white/10 ${isSpeaking ? 'bg-gradient-to-br from-blue-400/90 to-cyan-300/90' : (isMuted ? 'bg-gradient-to-br from-red-900/80 to-red-600/80' : 'bg-gradient-to-br from-purple-400/80 to-pink-300/80')}`}
                                style={{ transform: `scale(${scale})` }}
                            >
                                {isConnected ? (
                                    isMuted ? <MicOff size={40} className="text-white mix-blend-overlay" /> : <Mic size={40} className="text-white mix-blend-overlay" />
                                ) : (
                                    <Loader2 size={40} className="animate-spin text-white mix-blend-overlay" />
                                )}
                            </div>

                            {/* Ripple Effect when user speaks */}
                            {isConnected && !isSpeaking && !isMuted && (
                                <div 
                                    className="absolute inset-0 rounded-full border-2 border-white/20"
                                    style={{ transform: `scale(${scale * 1.5})`, opacity: Math.max(0, volume - 0.1) }}
                                />
                            )}
                        </div>

                        {/* Controls Bar */}
                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-lg shadow-2xl">
                            {/* Mute Toggle */}
                            <button
                                onClick={toggleMute}
                                disabled={!isConnected}
                                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 text-white hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={isMuted ? "Unmute Mic" : "Mute Mic"}
                            >
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            {/* Camera Toggle */}
                            <button
                                onClick={toggleCamera}
                                disabled={!isConnected}
                                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 ${videoSource === 'camera' ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={videoSource === 'camera' ? "Stop Camera" : "Start Camera"}
                            >
                                {videoSource === 'camera' ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>

                            {/* Screen Share Toggle */}
                            <button
                                onClick={toggleScreen}
                                disabled={!isConnected}
                                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 ${videoSource === 'screen' ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-white/10 text-white hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                title={videoSource === 'screen' ? "Stop Screen Share" : "Share Screen"}
                            >
                                <MonitorUp size={24} />
                            </button>

                            <div className="w-px h-8 bg-white/20 mx-2"></div>

                            {/* End Call */}
                            <button
                                onClick={disconnect}
                                className="group flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-300 shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95"
                                title="End Call"
                            >
                                <PhoneOff size={28} />
                            </button>
                        </div>
                    </>
                )}
            </div>
            
            {/* Hidden Video Element (referenced by useLiveVideo logic, rendered here for binding) */}
            {!videoStream && (
                <video ref={videoRef} className="hidden" />
            )}
        </Modal>
    );
};
