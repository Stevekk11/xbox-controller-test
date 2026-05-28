import { useEffect, useMemo, useRef, useState } from 'react'

const BUTTON_LABELS = [
  'A',
  'B',
  'X',
  'Y',
  'Left Bumper',
  'Right Bumper',
  'Left Trigger',
  'Right Trigger',
  'View',
  'Menu',
  'Left Stick',
  'Right Stick',
  'D-Pad Up',
  'D-Pad Down',
  'D-Pad Left',
  'D-Pad Right',
  'Xbox',
]

const AXIS_LABELS = ['Left Stick X', 'Left Stick Y', 'Right Stick X', 'Right Stick Y']

type ButtonSnapshot = {
  label: string
  value: number
  pressed: boolean
  tested: boolean
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function App() {
  const [pads, setPads] = useState<Gamepad[]>([])
  const [selectedPad, setSelectedPad] = useState<number | null>(null)
  const [buttonState, setButtonState] = useState<ButtonSnapshot[]>([])
  const [axes, setAxes] = useState<number[]>([])
  const [testedButtonsCount, setTestedButtonsCount] = useState(0)
  const [maxAxisValues, setMaxAxisValues] = useState<number[]>([])
  const [deadZone, setDeadZone] = useState(0.14)
  const [vibrationMessage, setVibrationMessage] = useState('Idle')
  const [vibrationRunning, setVibrationRunning] = useState(false)

  const testedButtonsRef = useRef<Record<number, Set<number>>>({})
  const maxAxisRef = useRef<Record<number, number[]>>({})
  const rafRef = useRef<number | null>(null)

  const activeGamepad = useMemo(
    () => pads.find((pad) => pad.index === selectedPad) ?? pads[0] ?? null,
    [pads, selectedPad],
  )

  useEffect(() => {
    const getPads = () =>
      (navigator.getGamepads?.() ?? [])
        .filter((pad): pad is Gamepad => Boolean(pad && pad.connected))

    const tick = () => {
      const connected = getPads()
      setPads(connected)

      if (connected.length > 0) {
        setSelectedPad((current) =>
          current !== null && connected.some((pad) => pad.index === current)
            ? current
            : connected[0].index,
        )
      } else {
        setSelectedPad(null)
        setAxes([])
        setButtonState([])
        setTestedButtonsCount(0)
        setMaxAxisValues([])
      }

      const nextActive =
        connected.find((pad) => pad.index === selectedPad) ?? connected[0] ?? null

      if (nextActive) {
        testedButtonsRef.current[nextActive.index] ??= new Set<number>()
        maxAxisRef.current[nextActive.index] ??= new Array(nextActive.axes.length).fill(0)

        const testedButtons = testedButtonsRef.current[nextActive.index]
        const maxAxis = maxAxisRef.current[nextActive.index]

        const nextButtons = nextActive.buttons.map((button, index) => {
          if (button.pressed || button.value > 0) {
            testedButtons.add(index)
          }

          return {
            label: BUTTON_LABELS[index] ?? `Button ${index}`,
            value: Number(button.value.toFixed(2)),
            pressed: button.pressed,
            tested: testedButtons.has(index),
          }
        })

        const nextAxes = nextActive.axes.map((axisValue, index) => {
          maxAxis[index] = Math.max(maxAxis[index] ?? 0, Math.abs(axisValue))
          return Number(axisValue.toFixed(2))
        })

        setButtonState(nextButtons)
        setAxes(nextAxes)
        setTestedButtonsCount(testedButtons.size)
        setMaxAxisValues([...maxAxis])
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [selectedPad])

  const unsupportedMessage =
    typeof navigator.getGamepads === 'function'
      ? null
      : 'Gamepad API is not supported in this browser.'

  const totalButtons = buttonState.length

  const driftCount = axes.filter((axisValue) => Math.abs(axisValue) > deadZone).length

  const runVibration = async (weakMagnitude: number, strongMagnitude: number, duration = 450) => {
    if (!activeGamepad) {
      setVibrationMessage('Connect a controller first.')
      return
    }

    const target = activeGamepad as Gamepad & {
      vibrationActuator?: {
        playEffect?: (type: string, options: Record<string, number>) => Promise<unknown>
        pulse?: (value: number, duration: number) => Promise<unknown>
      }
      hapticActuators?: Array<{
        pulse?: (value: number, duration: number) => Promise<unknown>
      }>
    }

    const actuator = target.vibrationActuator ?? target.hapticActuators?.[0]

    if (!actuator) {
      setVibrationMessage('No vibration actuator detected on this controller/browser.')
      return
    }

    try {
      setVibrationMessage(`Running ${duration}ms vibration test...`)
      if (actuator.playEffect) {
        await actuator.playEffect('dual-rumble', {
          duration,
          startDelay: 0,
          weakMagnitude,
          strongMagnitude,
        })
      } else if (actuator.pulse) {
        await actuator.pulse(Math.max(weakMagnitude, strongMagnitude), duration)
      }
      setVibrationMessage('Vibration complete.')
    } catch {
      setVibrationMessage('Vibration failed. Browser may block haptics.')
    }
  }

  const runAdvancedVibrationRoutine = async () => {
    if (vibrationRunning) {
      return
    }

    setVibrationRunning(true)
    setVibrationMessage('Starting advanced vibration routine...')

    try {
      await runVibration(1, 0.25, 350)
      await sleep(220)
      await runVibration(0.25, 1, 350)
      await sleep(220)
      await runVibration(0.7, 0.7, 500)
      setVibrationMessage('Advanced routine complete.')
    } finally {
      setVibrationRunning(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Xbox Controller Advanced Test</h1>
            <p className="mt-2 text-sm text-slate-300">
              Validate every button, analog axis, trigger, and vibration motor using the browser Gamepad API.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-200">
            <span>
              Status:{' '}
              <strong className={activeGamepad ? 'text-emerald-400' : 'text-amber-300'}>
                {activeGamepad ? 'Controller connected' : 'Waiting for controller'}
              </strong>
            </span>
            {activeGamepad && <span>Detected: {activeGamepad.id}</span>}
          </div>
        </header>

        {unsupportedMessage && (
          <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {unsupportedMessage}
          </div>
        )}

        <section className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-3">
          <label className="text-sm text-slate-300 md:col-span-1">
            Active controller
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              value={activeGamepad?.index ?? ''}
              onChange={(event) => setSelectedPad(Number(event.target.value))}
              disabled={pads.length === 0}
            >
              {pads.length === 0 ? (
                <option value="">No controllers connected</option>
              ) : (
                pads.map((pad) => (
                  <option key={pad.index} value={pad.index}>
                    {pad.index}: {pad.id}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-200">
            <p className="font-semibold text-white">Button coverage</p>
            <p className="mt-2">
              {testedButtonsCount}/{totalButtons || 0} buttons tested this session
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-200">
            <p className="font-semibold text-white">Stick drift check</p>
            <p className="mt-2">{driftCount} axis values outside dead zone</p>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Buttons</h2>
              <button
                type="button"
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  if (activeGamepad) {
                    testedButtonsRef.current[activeGamepad.index] = new Set()
                    setButtonState((current) =>
                      current.map((button) => ({ ...button, tested: false })),
                    )
                    setTestedButtonsCount(0)
                  }
                }}
              >
                Reset checklist
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {buttonState.length === 0 && <p className="text-sm text-slate-400">Press a controller button to start.</p>}
              {buttonState.map((button) => (
                <div
                  key={button.label}
                  className={`rounded-lg border p-2 text-sm ${
                    button.pressed
                      ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-200'
                      : button.tested
                        ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-100'
                        : 'border-slate-800 bg-slate-900/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{button.label}</span>
                    <span className="text-xs">{button.pressed ? 'Pressed' : 'Idle'}</span>
                  </div>
                  <div className="mt-2 h-2 rounded bg-slate-800">
                    <div className="h-full rounded bg-cyan-400" style={{ width: `${button.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Axes, triggers, and dead zone</h2>
            <label className="mb-4 block text-xs uppercase tracking-wide text-slate-400">
              Dead zone: {deadZone.toFixed(2)}
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.01"
                value={deadZone}
                onChange={(event) => setDeadZone(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <div className="space-y-3">
              {AXIS_LABELS.map((label, index) => {
                const value = axes[index] ?? 0
                const isWarning = Math.abs(value) > deadZone
                const percentage = Math.min(100, Math.abs(value) * 100)

                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={isWarning ? 'text-amber-300' : 'text-slate-200'}>{label}</span>
                      <span className="text-slate-300">current: {value.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded bg-slate-800">
                      <div
                        className={`h-full rounded ${isWarning ? 'bg-amber-400' : 'bg-sky-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      max observed: {(maxAxisValues[index] ?? 0).toFixed(2)}
                    </p>
                  </div>
                )
              })}
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Vibration and haptic tests</h2>
          <p className="mb-4 text-sm text-slate-300">{vibrationMessage}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
              onClick={() => runVibration(1, 0.25)}
              disabled={vibrationRunning}
            >
              Weak motor focus
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
              onClick={() => runVibration(0.25, 1)}
              disabled={vibrationRunning}
            >
              Strong motor focus
            </button>
            <button
              type="button"
              className="rounded-lg border border-cyan-500/70 bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30"
              onClick={runAdvancedVibrationRoutine}
              disabled={vibrationRunning}
            >
              Run advanced routine
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
