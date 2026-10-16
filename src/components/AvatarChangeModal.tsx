import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Check, 
  Link as LinkIcon, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  RotateCcw,
  CheckCircle2,
  Video
} from 'lucide-react';

interface AvatarChangeModalProps {
  currentAvatar: string;
  userName: string;
  onClose: () => void;
  onSaveAvatar: (newAvatarUrl: string) => void;
}

/**
 * The server stores the picture in the user profile, so every source is cropped to the centre
 * square and shrunk to a 256x256 JPEG (a few tens of KB). Drawing onto a canvas also turns SVG
 * into a plain image. Returns null when the source has no size.
 */
function squareJpeg(source: CanvasImageSource, width: number, height: number, mirror = false): string | null {
  const size = 256;
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context || !side) return null;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  if (mirror) {
    // Keep the photo as the person saw it in the mirrored camera preview.
    context.translate(size, 0);
    context.scale(-1, 1);
  }
  context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started. Use Upload Photo instead.';
}

const PRESET_AVATARS = [
  { id: 'av-1', name: 'Executive Male 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-2', name: 'Executive Female 1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-3', name: 'Leader Male 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-4', name: 'Leader Female 2', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-5', name: 'Investor Male 3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-6', name: 'Professional Female 3', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-7', name: 'Tech Lead', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80' },
  { id: 'av-8', name: 'Senior Advisor', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' },
];

export const AvatarChangeModal: React.FC<AvatarChangeModalProps> = ({
  currentAvatar,
  userName,
  onClose,
  onSaveAvatar
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'preset' | 'url'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  // The camera runs only while its tab is open, and is switched off when leaving it or closing the window.
  useEffect(() => {
    if (activeTab !== 'camera') return undefined;
    let cancelled = false;
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg(window.isSecureContext ? 'This browser cannot use the camera. Use Upload Photo instead.' : 'The camera only works on a secure (https) page.');
      return undefined;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
        }
      })
      .catch((error) => { if (!cancelled) setErrorMsg(cameraErrorMessage(error)); });
    return () => { cancelled = true; stopCamera(); };
  }, [activeTab]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const photo = squareJpeg(video, video.videoWidth, video.videoHeight, true);
    if (photo) setPreviewUrl(photo);
    else setErrorMsg('The photo could not be taken. Try again.');
  };

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 10MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const photo = squareJpeg(image, image.naturalWidth, image.naturalHeight);
      if (photo) setPreviewUrl(photo);
      else setErrorMsg('This image could not be read. Try another file.');
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setErrorMsg('This image could not be read. Try another file.');
    };
    image.src = objectUrl;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUrlApply = () => {
    if (!customUrl.trim()) return;
    setPreviewUrl(customUrl.trim());
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!previewUrl) return;
    onSaveAvatar(previewUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Change Profile Picture
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update avatar for {userName}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700/80 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Display Card */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col items-center justify-center gap-3">
          <div className="relative group">
            <img 
              src={previewUrl} 
              alt="Avatar Preview" 
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl bg-slate-200 dark:bg-slate-700"
              onError={() => setErrorMsg('Failed to load image preview. Check URL or try another photo.')}
            />
            <div className="absolute -bottom-2 right-1 bg-emerald-600 text-white p-1.5 rounded-full shadow-md text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Live Preview
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700/60">
          {[
            { id: 'upload', label: 'Upload Photo', icon: <Upload className="w-3.5 h-3.5" /> },
            { id: 'camera', label: 'Take Photo', icon: <Video className="w-3.5 h-3.5" /> },
            { id: 'preset', label: 'Preset Gallery', icon: <ImageIcon className="w-3.5 h-3.5" /> },
            { id: 'url', label: 'Image URL', icon: <LinkIcon className="w-3.5 h-3.5" /> }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: FILE UPLOAD */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                Click to browse or drag & drop photo here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports JPG, PNG, WEBP, or SVG (Up to 10MB)
              </p>
            </div>
          </div>
        )}

        {/* TAB: CAMERA */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative mx-auto w-full max-w-xs aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" aria-label="Camera preview" />
              {!cameraReady && !errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-300">Starting camera… allow access if your browser asks.</div>
              )}
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={takePhoto}
                disabled={!cameraReady}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-400">The photo appears in the preview above. Take it again until you are happy, then press Save.</p>
          </div>
        )}

        {/* TAB 2: PRESET GALLERY */}
        {activeTab === 'preset' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Choose from Professional Avatars
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 max-h-52 overflow-y-auto p-1">
              {PRESET_AVATARS.map(avatar => {
                const selected = previewUrl === avatar.url;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(avatar.url);
                      setErrorMsg(null);
                    }}
                    className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all cursor-pointer group ${
                      selected ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <img 
                      src={avatar.url} 
                      alt={avatar.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {selected && (
                      <div className="absolute inset-0 bg-emerald-600/30 backdrop-blur-[1px] flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: IMAGE URL */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Paste Direct Image Link
            </label>
            <div className="flex gap-2">
              <input 
                type="url"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-2xl hover:bg-emerald-700 cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(currentAvatar);
              setErrorMsg(null);
            }}
            className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Profile Picture</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
