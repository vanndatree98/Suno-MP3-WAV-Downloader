import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderArchive,
  Disc3,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Music,
  FileAudio,
  Sparkles,
  RefreshCw,
  Clock,
  Check,
  Copy,
  Minimize2,
  ShieldCheck,
  Tag,
  Zap,
  ListMusic,
  CheckCheck,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { AsyncZipJobStatus, AudioFormat, ProfileSongItem } from '../types.js';
import type { Language } from '../i18n.js';
import { translations } from '../i18n.js';
import { calculateRemainingTime } from '../utils/timeEstimator.js';

interface AsyncZipModalProps {
  isOpen: boolean;
  job: AsyncZipJobStatus | null;
  playlistName: string;
  totalSongs: number;
  format?: AudioFormat | 'both';
  bitDepth?: 16 | 24;
  selectedSongIds?: string[];
  songsList?: ProfileSongItem[];
  onStartDownload?: (format: AudioFormat | 'both', bitDepth: 16 | 24, targetSongIds?: string[]) => void;
  onCancel: () => void;
  onClose: () => void;
  onRetry?: () => void;
  lang: Language;
}

export const AsyncZipModal: React.FC<AsyncZipModalProps> = ({
  isOpen,
  job,
  playlistName,
  totalSongs,
  format = 'mp3',
  bitDepth = 16,
  selectedSongIds = [],
  songsList = [],
  onStartDownload,
  onCancel,
  onClose,
  onRetry,
  lang
}) => {
  const t = translations[lang];

  // Selected format and bit depth for the interactive configuration mode
  const [chosenFormat, setChosenFormat] = useState<AudioFormat | 'both'>(format);
  const [chosenBitDepth, setChosenBitDepth] = useState<16 | 24>(bitDepth);
  const [useOnlySelected, setUseOnlySelected] = useState<boolean>(() => {
    return selectedSongIds.length > 0 && selectedSongIds.length < totalSongs;
  });
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync format and bit depth when modal opens
  useEffect(() => {
    if (isOpen) {
      if (format) setChosenFormat(format);
      if (bitDepth) setChosenBitDepth(bitDepth);
      if (selectedSongIds.length > 0 && selectedSongIds.length < totalSongs) {
        setUseOnlySelected(true);
      } else {
        setUseOnlySelected(false);
      }
      setCopiedLink(false);
    }
  }, [isOpen, format, bitDepth, selectedSongIds.length, totalSongs]);

  const isProcessing = job?.status === 'queued' || job?.status === 'processing';
  const isReady = job?.status === 'ready';
  const isError = job?.status === 'error';
  const isCancelled = job?.status === 'cancelled';
  const isConfiguring = !isProcessing && !isReady && !isError && !isCancelled;

  const [jobStartTime, setJobStartTime] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      if (!jobStartTime) {
        setJobStartTime(Date.now());
      }
      const timer = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(timer);
    } else {
      setJobStartTime(null);
    }
  }, [isProcessing]);

  const remainingTimeStr = useMemo(() => {
    if (!isProcessing || !jobStartTime) return null;
    return calculateRemainingTime(jobStartTime, job?.percent ?? 0, t, lang);
  }, [isProcessing, jobStartTime, job?.percent, t, lang]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isProcessing) {
          onClose(); // Minimize on Escape rather than abruptly cancel
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const targetCount = useOnlySelected && selectedSongIds.length > 0 ? selectedSongIds.length : totalSongs;

  // Estimated Size Calculation
  const estMp3 = Math.max(1, Math.round(targetCount * 3.8));
  const estWav16 = Math.max(1, Math.round(targetCount * 42));
  const estWav24 = Math.max(1, Math.round(targetCount * 64));
  const estBoth = estMp3 + (chosenBitDepth === 24 ? estWav24 : estWav16);

  const calculatedSize =
    chosenFormat === 'both'
      ? estBoth
      : chosenFormat === 'wav'
      ? chosenBitDepth === 24
        ? estWav24
        : estWav16
      : estMp3;

  const effectiveFormat = job?.format || format || chosenFormat;
  const effectiveBitDepth = job?.bitDepth || bitDepth || chosenBitDepth;

  const formatBadgeLabel =
    effectiveFormat === 'both'
      ? 'MP3 320k + WAV'
      : effectiveFormat === 'wav'
      ? `${effectiveBitDepth}-bit WAV Lossless`
      : 'MP3 320kbps';

  const downloadUrl = job?.id ? `/api/playlist/download-all/file/${job.id}` : '#';

  const handleCopyLink = () => {
    if (!job?.id) return;
    const fullUrl = `${window.location.origin}/api/playlist/download-all/file/${job.id}`;
    navigator.clipboard?.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const handleLaunch = () => {
    if (onStartDownload) {
      const ids = useOnlySelected && selectedSongIds.length > 0 ? selectedSongIds : undefined;
      onStartDownload(chosenFormat, chosenBitDepth, ids);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="async-zip-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative overflow-hidden text-neutral-100 cursor-default my-auto max-h-[92vh] flex flex-col"
      >
        {/* Glow ambient background accents */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-neutral-800/80 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/10 shrink-0">
              {isProcessing ? (
                <Disc3 className="w-5 h-5 animate-spin text-amber-400" />
              ) : isReady ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                  <FolderArchive className="w-3 h-3" />
                  <span>{t.advancedTrackingModalTitle || 'ផ្ទាំងតាមដានទាញយកកម្រិតខ្ពស់'}</span>
                </span>

                {isProcessing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span>{lang === 'km' ? 'កំពុងដំណើរការផ្ទាល់' : 'Live Packaging'}</span>
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 text-[10px] font-mono border border-neutral-700/80">
                  {formatBadgeLabel}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate max-w-sm sm:max-w-md">
                {playlistName || 'Suno Playlist'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isProcessing && (
              <button
                type="button"
                id="minimize-async-zip-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title={t.minimizeModal || 'បង្រួមផ្ទាំង (Minimize)'}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id="close-async-zip-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={t.asyncZipCloseButton || 'បិទ'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 relative z-10">
          {/* ========================================================= */}
          {/* STATE 1: CONFIGURATION / PRE-LAUNCH (When idle or not busy) */}
          {/* ========================================================= */}
          {isConfiguring && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 text-xs text-neutral-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-100">
                    {t.advancedTrackingModalSubtitle ||
                      'ទាញយកបទចម្រៀងគុណភាពខ្ពស់ 320kbps MP3 & WAV Studio Master ជាមួយការតាមដានជាក់ស្តែង'}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {lang === 'km'
                      ? 'ជ្រើសរើសទម្រង់សម្លេង និងចាប់ផ្តើមដំណើរការបង្រួមកញ្ចប់ ZIP ជាមួយការបង្ហាញភាគរយ និងពេលវេលាជាក់ស្តែង។'
                      : 'Choose your preferred audio quality and start background packaging with real-time ETA & live progress.'}
                  </p>
                </div>
              </div>

              {/* Track Scope Selector */}
              {selectedSongIds.length > 0 && selectedSongIds.length < totalSongs && (
                <div className="p-2.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'km' ? 'ចំនួនបទសម្រាប់ទាញយក:' : 'Target track count:'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUseOnlySelected(false)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        !useOnlySelected
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                          : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {lang === 'km' ? `ទាំងអស់ (${totalSongs} បទ)` : `All (${totalSongs})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseOnlySelected(true)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        useOnlySelected
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                          : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {lang === 'km' ? `បានជ្រើស (${selectedSongIds.length} បទ)` : `Selected (${selectedSongIds.length})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Format Selection Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.selectHighQualityFormat || 'ជ្រើសរើសគុណភាពសម្លេងកម្រិតខ្ពស់:'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    ~{calculatedSize} MB {lang === 'km' ? 'សរុប' : 'total'}
                  </span>
                </div>

                {/* Option 1: MP3 320kbps */}
                <button
                  type="button"
                  id="modal-select-mp3"
                  onClick={() => setChosenFormat('mp3')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    chosenFormat === 'mp3'
                      ? 'bg-amber-500/15 border-amber-500/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/70 hover:bg-neutral-850 border-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                      chosenFormat === 'mp3'
                        ? 'border-amber-400 bg-amber-400 text-neutral-950'
                        : 'border-neutral-600'
                    }`}
                  >
                    {chosenFormat === 'mp3' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.formatHighMp3Title || 'MP3 កម្រិតខ្ពស់ (320kbps CBR)'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                        ~{estMp3} MB
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {t.formatHighMp3Desc ||
                        'គុណភាពខ្ពស់បំផុត 320kbps CBR ភ្ជាប់ ID3 tags និងរូបក្រប ត្រូវគ្នាគ្រប់ឧបករណ៍ (~3.8MB/បទ)'}
                    </p>
                  </div>
                </button>

                {/* Option 2: Lossless WAV (with 24-bit / 16-bit selector) */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    chosenFormat === 'wav'
                      ? 'bg-sky-500/15 border-sky-500/80 shadow-md shadow-sky-500/10 ring-1 ring-sky-400/50'
                      : 'bg-neutral-950/70 hover:bg-neutral-850 border-neutral-800'
                  }`}
                >
                  <button
                    type="button"
                    id="modal-select-wav"
                    onClick={() => setChosenFormat('wav')}
                    className="w-full text-left cursor-pointer flex items-start gap-3"
                  >
                    <div
                      className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                        chosenFormat === 'wav'
                          ? 'border-sky-400 bg-sky-400 text-neutral-950'
                          : 'border-neutral-600'
                      }`}
                    >
                      {chosenFormat === 'wav' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <FileAudio className="w-3.5 h-3.5 text-sky-400" />
                          <span>{t.formatLosslessWavTitle || 'WAV Lossless គុណភាពដើមស្ទូឌីយោ'}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300">
                          ~{chosenBitDepth === 24 ? estWav24 : estWav16} MB
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        {t.formatLosslessWavDesc ||
                          'សម្លេង PCM មិនបង្រួម គ្មានការបាត់បង់គុណភាព ស័ក្តិសមសម្រាប់ Studio & Mixing'}
                      </p>
                    </div>
                  </button>

                  {/* Bit-depth selection tabs */}
                  <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-medium">
                      {lang === 'km' ? 'កម្រិតប៊ីត (Bit Depth):' : 'Studio Bit Depth:'}
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-neutral-950 rounded-lg border border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          setChosenFormat('wav');
                          setChosenBitDepth(16);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          chosenBitDepth === 16 && chosenFormat === 'wav'
                            ? 'bg-sky-500 text-neutral-950 shadow'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        16-bit (CD)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChosenFormat('wav');
                          setChosenBitDepth(24);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                          chosenBitDepth === 24 && chosenFormat === 'wav'
                            ? 'bg-sky-500 text-neutral-950 shadow'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        24-bit Studio Master
                      </button>
                    </div>
                  </div>
                </div>

                {/* Option 3: Combo Pack (MP3 + WAV) */}
                <button
                  type="button"
                  id="modal-select-both"
                  onClick={() => setChosenFormat('both')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    chosenFormat === 'both'
                      ? 'bg-gradient-to-r from-amber-500/15 via-sky-500/15 to-transparent border-amber-400/80 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                      : 'bg-neutral-950/70 hover:bg-neutral-850 border-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                      chosenFormat === 'both'
                        ? 'border-amber-400 bg-amber-400 text-neutral-950'
                        : 'border-neutral-600'
                    }`}
                  >
                    {chosenFormat === 'both' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                        <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.formatBothTitle || 'កញ្ចប់រួម MP3 + WAV'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                        ~{estBoth} MB
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      {t.formatBothDesc ||
                        'រួមបញ្ចូលទាំង MP3 320kbps និង Lossless WAV ក្នុង ZIP តែមួយ ងាយស្រួលរក្សាទុកគ្រប់ទម្រង់'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Quality & Metadata Guarantees Ribbon */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-neutral-400">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{t.khmerUnicodeGuaranteed || 'រក្សាឈ្មោះដើមជាភាសាខ្មែរ 100%'}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                  <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{t.embeddedMetadata || 'ភ្ជាប់រូបក្រប & ID3 Tags ពេញលេញ'}</span>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  id="start-advanced-tracking-download-btn"
                  onClick={handleLaunch}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:brightness-105 active:scale-[0.99] text-neutral-950 font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    {t.startAdvancedDownload || 'ចាប់ផ្តើមទាញយកកម្រិតខ្ពស់'} ({targetCount} {lang === 'km' ? 'បទ' : 'tracks'})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STATE 2: PROCESSING & REAL-TIME TRACKING                  */}
          {/* ========================================================= */}
          {isProcessing && (
            <div className="space-y-4 relative z-10 py-1 animate-in fade-in duration-200">
              {/* Disc Graphic + Waveform + Percentage Card */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                      <Disc3 className="w-7 h-7 text-amber-400 animate-spin" />

                      {/* Animated Audio Equalizer Bars */}
                      <div className="absolute inset-x-2 bottom-1.5 flex items-end justify-center gap-1 h-3 pointer-events-none">
                        <span className="w-1 bg-amber-400/80 rounded-full animate-bounce [animation-delay:0ms] h-2" />
                        <span className="w-1 bg-amber-400/80 rounded-full animate-bounce [animation-delay:150ms] h-3" />
                        <span className="w-1 bg-amber-400/80 rounded-full animate-bounce [animation-delay:300ms] h-1.5" />
                        <span className="w-1 bg-amber-400/80 rounded-full animate-bounce [animation-delay:200ms] h-2.5" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400 font-medium">
                        {lang === 'km' ? 'ដំណើរការបង្រួមកញ្ចប់កម្រិតខ្ពស់' : 'High-Quality Packaging Engine'}
                      </p>
                      <p className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                        {t.asyncZipStatusProcessing}
                      </p>
                      <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                        {formatBadgeLabel} • {job?.total || totalSongs} {lang === 'km' ? 'បទ' : 'tracks'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono leading-none tracking-tight">
                      {job?.percent ?? 0}%
                    </span>
                    {remainingTimeStr && (
                      <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1 mt-1.5 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                        <Clock className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
                        <span>{remainingTimeStr}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar Container with Numbers */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-300 font-medium">
                    {job?.total ? (
                      t.asyncZipProgressItem
                        .replace('{current}', String(job.current))
                        .replace('{total}', String(job.total))
                        .replace('{title}', '')
                        .replace('៖', '')
                        .replace(':', '')
                        .trim()
                    ) : (
                      <span>
                        {job?.current ?? 0} / {totalSongs}
                      </span>
                    )}
                  </span>
                  <span className="text-amber-400 text-xs font-mono font-bold">
                    {job?.current ?? 0}/{job?.total ?? totalSongs} {lang === 'km' ? 'បទបានបញ្ចប់' : 'completed'}
                  </span>
                </div>

                <div className="w-full bg-neutral-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-neutral-700/70 shadow-inner">
                  <div
                    id="async-zip-progress-bar-fill"
                    role="progressbar"
                    aria-valuenow={job?.percent ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 h-full rounded-full transition-all duration-300 shadow-md shadow-amber-500/50"
                    style={{ width: `${Math.max(job?.percent ?? 0, 4)}%` }}
                  />
                </div>
              </div>

              {/* Current Active Song & Conversion Step */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <Music className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-100 truncate">
                    {job?.currentTitle || (lang === 'km' ? 'កំពុងត្រៀមបទចម្រៀង...' : 'Preparing tracks...')}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span className="truncate">
                      {job?.currentStep || (lang === 'km' ? 'កំពុងទាញយកសម្លេងពី Suno CDN...' : 'Fetching audio from Suno CDN...')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  id="minimize-tracking-btn"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
                  title="Minimize and keep downloading in background"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>{t.minimizeModal || 'បង្រួមផ្ទាំង (Minimize)'}</span>
                </button>

                <button
                  type="button"
                  id="cancel-async-zip-btn"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t.asyncZipCancelButton}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STATE 3: READY & DOWNLOAD                                  */}
          {/* ========================================================= */}
          {isReady && (
            <div className="space-y-4 relative z-10 py-1 animate-in fade-in duration-200">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg shadow-emerald-500/5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-bold text-emerald-300">
                    {t.asyncZipStatusReady}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {t.asyncZipDownloadAuto}
                  </p>
                </div>
              </div>

              {/* Archive Info Card */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>{lang === 'km' ? 'ឈ្មោះកញ្ចប់ ZIP:' : 'Archive Filename:'}</span>
                  <span className="text-neutral-100 font-mono font-semibold truncate max-w-[240px] sm:max-w-xs">
                    {job?.zipFilenameUnicode || 'Playlist.zip'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>{t.asyncZipSize}:</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    {formatBytes(job?.zipSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>{t.totalTracks}:</span>
                  <span className="text-neutral-200 font-semibold">{job?.total || totalSongs} tracks</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>{lang === 'km' ? 'គុណភាពសម្លេង:' : 'Audio Quality:'}</span>
                  <span className="text-sky-400 font-mono font-semibold">{formatBadgeLabel}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <a
                  id="direct-download-zip-btn"
                  href={downloadUrl}
                  download={job?.zipFilenameUnicode || 'Playlist.zip'}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:brightness-105 text-neutral-950 font-extrabold text-sm sm:text-base transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.asyncZipDownloadButton} ({formatBytes(job?.zipSize)})</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">{t.linkCopied || 'បានចម្លង!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.copyDirectLink || 'ចម្លង Link'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {t.asyncZipCloseButton}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STATE 4: ERROR                                            */}
          {/* ========================================================= */}
          {isError && (
            <div className="space-y-4 relative z-10 py-1 animate-in fade-in duration-200">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-rose-300">
                    {t.asyncZipStatusError}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1">
                    {job?.error || t.errorFetch}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {onRetry && (
                  <button
                    type="button"
                    id="retry-async-zip-btn"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'ព្យាយាមម្តងទៀត' : 'Retry'}</span>
                  </button>
                )}
                <button
                  type="button"
                  id="close-error-async-zip-btn"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  {t.asyncZipCloseButton}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STATE 5: CANCELLED                                        */}
          {/* ========================================================= */}
          {isCancelled && (
            <div className="space-y-4 relative z-10 py-1 animate-in fade-in duration-200">
              <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-semibold text-neutral-200">
                    {t.asyncZipStatusCancelled}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {lang === 'km'
                      ? 'អ្នកបានបញ្ឈប់ដំណើរការបង្កើតកញ្ចប់ ZIP'
                      : 'The background packaging process was halted.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {onRetry && (
                  <button
                    type="button"
                    id="restart-cancelled-async-zip-btn"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'km' ? 'ចាប់ផ្តើមឡើងវិញ' : 'Restart'}</span>
                  </button>
                )}
                <button
                  type="button"
                  id="close-cancelled-async-zip-btn"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  {t.asyncZipCloseButton}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
