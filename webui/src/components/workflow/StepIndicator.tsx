import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

const steps = [
  { id: 'scan', label: 'Scan', number: 1 },
  { id: 'select', label: 'Select', number: 2 },
  { id: 'config', label: 'Configure', number: 3 },
  { id: 'migration', label: 'Migrate', number: 4 },
]

export default function StepIndicator() {
  const currentStep = useAppStore((state) => state.currentStep)

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => {
          const isActive = index <= currentStepIndex
          const isCurrent = step.id === currentStep

          return (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.number}
                </motion.div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    isCurrent ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-6">
                  <motion.div
                    initial={false}
                    animate={{
                      scaleX: index < currentStepIndex ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-primary origin-left"
                    style={{ transformOrigin: 'left' }}
                  />
                  {index >= currentStepIndex && (
                    <div className="h-full bg-muted" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
