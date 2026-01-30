import type { ZimaOSDevice } from '../types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface Props {
  device: ZimaOSDevice
  onSelect: (device: ZimaOSDevice) => void
  selected?: boolean
}

export default function DeviceCard({ device, onSelect, selected }: Props) {
  return (
    <Card
      onClick={() => onSelect(device)}
      className={`
        relative h-48 overflow-hidden cursor-pointer transition-all group
        ${selected
          ? 'ring-2 ring-primary ring-offset-2'
          : 'hover:ring-2 hover:ring-primary/50'
        }
      `}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={device.image_url}
          alt={device.device_name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E'
          }}
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-between p-4">
        {/* Top Right Badge */}
        <div className="flex justify-end">
          {selected && (
            <Badge className="bg-primary/90 backdrop-blur-sm">
              <Check className="w-3 h-3 mr-1" />
              Selected
            </Badge>
          )}
        </div>

        {/* Bottom Info */}
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow-lg truncate">
              {device.device_name}
            </h3>
            <p className="text-sm text-white/90 drop-shadow">
              {device.device_model}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/80 drop-shadow font-mono">
              {device.ip}:{device.port}
            </p>
            <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0">
              {device.os_version}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  )
}
