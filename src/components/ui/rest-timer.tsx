'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Play, Pause, RotateCcw, X, Check, Volume2, Timer, Clock } from 'lucide-react'

interface RestTimerProps {
  isOpen: boolean
  onClose: () => void
  defaultSeconds?: number
  onComplete?: () => void
}

export function RestTimer({ isOpen, onClose, defaultSeconds = 60, onComplete }: RestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer')
  const [stopwatchTime, setStopwatchTime] = useState(0)

  const presets = [30, 60, 90, 120]

  // Reset timer when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Using requestAnimationFrame to avoid synchronous setState in effect
      const timer = requestAnimationFrame(() => {
        setSeconds(defaultSeconds)
        setIsRunning(false)
        setIsFinished(false)
        setSelectedPreset(presets.includes(defaultSeconds) ? defaultSeconds : null)
        setMode('timer')
        setStopwatchTime(0)
      })
      return () => cancelAnimationFrame(timer)
    }
  }, [isOpen, defaultSeconds])

  // Timer logic (countdown)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (mode === 'timer' && isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsFinished(true)
            // Play sound
            playBeep()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [mode, isRunning, seconds])

  // Stopwatch logic (count up)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (mode === 'stopwatch' && isRunning) {
      interval = setInterval(() => {
        setStopwatchTime((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [mode, isRunning])

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      
      // Beep pattern
      setTimeout(() => {
        gainNode.gain.value = 0
      }, 200)
      setTimeout(() => {
        gainNode.gain.value = 0.3
      }, 300)
      setTimeout(() => {
        gainNode.gain.value = 0
      }, 500)
      setTimeout(() => {
        oscillator.stop()
      }, 600)
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  const toggleTimer = () => {
    if (mode === 'timer' && isFinished) {
      resetTimer()
    } else {
      setIsRunning(!isRunning)
    }
  }

  const resetTimer = () => {
    if (mode === 'timer') {
      setSeconds(defaultSeconds)
      setIsFinished(false)
    } else {
      setStopwatchTime(0)
    }
    setIsRunning(false)
  }

  const selectPreset = (preset: number) => {
    setSelectedPreset(preset)
    setSeconds(preset)
    setIsRunning(false)
    setIsFinished(false)
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage for timer mode
  const progress = mode === 'timer' ? ((defaultSeconds - seconds) / defaultSeconds) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{mode === 'timer' ? 'Timer de Descanso' : 'Cronómetro'}</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => { setMode('timer'); setIsRunning(false); setSeconds(defaultSeconds); }}
            variant={mode === 'timer' ? 'default' : 'outline'}
            className={`flex-1 ${mode === 'timer' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-300'}`}
          >
            <Timer className="w-4 h-4 mr-2" />
            Timer
          </Button>
          <Button
            onClick={() => { setMode('stopwatch'); setIsRunning(false); setStopwatchTime(0); }}
            variant={mode === 'stopwatch' ? 'default' : 'outline'}
            className={`flex-1 ${mode === 'stopwatch' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-600 text-slate-300'}`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Cronómetro
          </Button>
        </div>

        <div className="flex flex-col items-center py-6">
          {/* Timer Circle */}
          <div className="relative w-64 h-64 mb-6">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="#374151"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle - only for timer mode */}
              {mode === 'timer' && (
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke={isFinished ? '#10b981' : '#8b5cf6'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                  className="transition-all duration-1000"
                />
              )}
              {/* Stopwatch mode - green circle */}
              {mode === 'stopwatch' && isRunning && (
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  className="animate-pulse"
                />
              )}
            </svg>
            
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-bold ${mode === 'timer' && isFinished ? 'text-emerald-400' : 'text-white'}`}>
                {mode === 'timer' ? formatTime(seconds) : formatTime(stopwatchTime)}
              </span>
              {mode === 'timer' && isFinished && (
                <span className="text-emerald-400 text-lg mt-2 animate-pulse">
                  ¡Completado!
                </span>
              )}
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={resetTimer}
              variant="outline"
              size="lg"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reiniciar
            </Button>
            <Button
              onClick={toggleTimer}
              size="lg"
              className={`${mode === 'stopwatch' ? 'bg-emerald-600 hover:bg-emerald-700' : isFinished ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'} px-8`}
            >
              {mode === 'timer' && isFinished ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Listo
                </>
              ) : isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
          </div>

          {/* Preset buttons - only for timer mode */}
          {mode === 'timer' && (
            <div className="w-full">
              <p className="text-slate-400 text-sm mb-3 text-center">Tiempo predefinido:</p>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset}
                    onClick={() => selectPreset(preset)}
                    variant={selectedPreset === preset ? 'default' : 'outline'}
                    className={selectedPreset === preset 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                    }
                  >
                    {preset}s
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom time input - only for timer mode */}
          {mode === 'timer' && (
            <div className="mt-4 w-full">
              <p className="text-slate-400 text-sm mb-2 text-center">O ingresa segundos personalizados:</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={seconds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setSeconds(Math.min(600, Math.max(5, val)))
                    setSelectedPreset(null)
                  }}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-center"
                />
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={() => {
                    if (seconds > 0) {
                      setIsRunning(false)
                      setIsFinished(false)
                    }
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Compact timer button component for inline use
export function TimerButton({ seconds = 60, onTimerStart }: { seconds?: number; onTimerStart?: () => void }) {
  const [showTimer, setShowTimer] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setShowTimer(true)
          onTimerStart?.()
        }}
        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
      >
        <Volume2 className="w-4 h-4 mr-1" />
        {seconds}s
      </Button>
      <RestTimer
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
        defaultSeconds={seconds}
      />
    </>
  )
}
