import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

const steps = [
  { id: 'select', label: 'Select', number: 1 },
  { id: 'config', label: 'Configure', number: 2 },
  { id: 'migration', label: 'Migrate', number: 3 },
]

export default function StepIndicator() {
  const currentStep = useAppStore((state) => state.currentStep)

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {steps.map((step, index) => {
        const isActive = index <= currentStepIndex
        const isCurrent = step.id === currentStep

        return (
          <div key={step.id} className="flex flex-col items-center relative">
            {/* Step circle */}
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.number}
            </motion.div>

            {/* Step label */}
            <span
              className={`mt-2 text-xs font-medium text-center ${
                isCurrent ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>

            {/* Vertical connecting line */}
            {index < steps.length - 1 && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-16">
                <motion.div
                  initial={false}
                  animate={{
                    scaleY: index < currentStepIndex ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-primary origin-top"
                  style={{ transformOrigin: 'top' }}
                />
                {index >= currentStepIndex && (
                  <div className="absolute inset-0 bg-muted" />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
