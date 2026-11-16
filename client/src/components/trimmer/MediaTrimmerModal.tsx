import { useEffect, useState } from 'react';
import { useDialog } from '../common/useDialog';
import { X, Scissors } from 'lucide-react';
interface Props {
    isOpen: boolean;
    onClose: () => void;
    file: File;
    targetDurationSec: number;
    onConfirmTrim: (start: number, duration: number) => Promise<void>;
}
export function MediaTrimmerModal({ isOpen, onClose, file, targetDurationSec, onConfirmTrim }: Props) {
    const [url, setUrl] = useState('');
    const [length, setLength] = useState(0);
    const [start, setStart] = useState(0);
    const [duration, setDuration] = useState(targetDurationSec);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const image = file.type.startsWith('image/');
    const ref = useDialog(isOpen, () => { if (!busy)
        onClose(); });
    useEffect(() => { const source = URL.createObjectURL(file); setUrl(source); return () => URL.revokeObjectURL(source); }, [file]);
    if (!isOpen)
        return null;
    return <div ref={ref} aria-label="Import and trim media" className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center"><div className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-lg bg-surface text-text-primary border border-subtle p-5 space-y-4">
 <div className="flex justify-between items-center"><h2 className="text-lg font-semibold flex gap-2"><Scissors />Import media</h2><button aria-label="Close import" disabled={busy} onClick={onClose}><X /></button></div>
 <p className="text-sm break-all">{file.name}</p>
 {image ? <img src={url} alt="Imported source preview" className="max-h-60 mx-auto"/> : <video src={url} controls preload="metadata" className="w-full max-h-60 bg-black" onLoadedMetadata={event => { const seconds = event.currentTarget.duration; if (Number.isFinite(seconds)) {
        setLength(seconds);
        setDuration(Math.min(targetDurationSec, seconds));
    } }} onError={() => setError('This browser cannot preview the file. Use MP4/H.264 for video or WAV/MP3 for audio.')}/>}
 {!image && <><p className="text-sm text-text-muted">Source duration: {length ? `${length.toFixed(2)} seconds` : 'Reading media…'}</p><label className="block text-sm">Start (seconds)<input type="number" min="0" max={Math.max(0, length - duration)} step="0.01" value={start} onChange={e => setStart(Number(e.target.value))} className="block w-full bg-card p-2 border border-subtle rounded"/></label></>}
 <label className="block text-sm">Duration (seconds)<input type="number" min="0.04" max={image ? 86400 : length - start} step="0.01" value={duration} onChange={e => setDuration(Number(e.target.value))} className="block w-full bg-card p-2 border border-subtle rounded"/></label>
 {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
 <p className="text-sm text-text-muted">The original stays in raw footage. A trimmed copy is attached to this node after processing.</p>
 <button disabled={busy || (!image && !length) || duration <= 0 || start < 0 || (!image && start + duration > length + 0.01)} className="w-full py-3 rounded bg-accent-primary text-app font-semibold disabled:opacity-50" onClick={async () => { setBusy(true); setError(''); try {
        await onConfirmTrim(start, duration);
        onClose();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}>{busy ? 'Processing media…' : 'Import and attach'}</button>
 </div></div>;
}
