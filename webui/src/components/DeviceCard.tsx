import type { ZimaOSDevice } from '../types';

interface Props {
  device: ZimaOSDevice;
  onSelect: (device: ZimaOSDevice) => void;
  selected?: boolean;
}

export default function DeviceCard({ device, onSelect, selected }: Props) {
  return (
    <div
      onClick={() => onSelect(device)}
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={device.image_url}
            alt={device.device_name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {device.device_name}
          </h3>
          <p className="text-sm text-gray-500">
            {device.device_model}
          </p>
          <p className="text-sm text-gray-600">
            {device.ip}:{device.port}
          </p>
          <p className="text-xs text-gray-400">
            {device.os_version}
          </p>
        </div>
        {selected && (
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
