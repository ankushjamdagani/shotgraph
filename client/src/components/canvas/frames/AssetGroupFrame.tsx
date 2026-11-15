import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Package } from 'lucide-react';
import { PORT_COLOR_MAP } from '../../../utils/graphTopology.js';

interface AssetGroupFrameProps {
  data: {
    id: string;
    title: string;
    assetCount: number;
    characterCount?: number;
    productCount?: number;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
  };
}

export const AssetGroupFrame: React.FC<AssetGroupFrameProps> = ({ data }) => {
  const { title, assetCount, characterCount = 0, productCount = 0 } = data;

  return (
    <div className="relative min-w-[280px] rounded-xl border-2 border-dashed border-purple-500/50 bg-[#120F1D]/80 backdrop-blur-md p-3.5 shadow-2xl transition hover:border-purple-400">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-500/20 text-purple-400">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-purple-200 tracking-wide">{title || 'Asset Group Frame'}</h4>
            <span className="text-[10px] text-purple-400/80 font-mono">Cascading Ensemble</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-500/30">
          {assetCount} items
        </span>
      </div>

      {/* Asset metrics badge */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-300 mb-2">
        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          <Users className="w-3 h-3 text-purple-400" /> {characterCount} cast
        </span>
        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          <Package className="w-3 h-3 text-amber-400" /> {productCount} props
        </span>
      </div>

      <p className="text-[10px] text-zinc-400 leading-tight">
        Connect this handle to a <strong className="text-purple-300">Scene Beat</strong> to automatically cascade all cast & props down to all shots in that scene.
      </p>

      {/* Cascading Output Handle on Right */}
      <div className="group/port">
        <Handle
          type="source"
          position={Position.Right}
          id="out_asset_cascade"
          style={{ backgroundColor: PORT_COLOR_MAP.spatial_3d }}
          className="!w-3 !h-3 !border-2 !border-black transition-transform hover:!scale-150 !z-30"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap bg-purple-950 border border-purple-500/40 text-purple-200 shadow-xl pointer-events-none">
          Cascade Asset Bundle (spatial_3d)
        </span>
      </div>
    </div>
  );
};
