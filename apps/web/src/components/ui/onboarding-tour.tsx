'use client'

import { useState } from 'react'

const STEPS = [
  { title: 'Welcome to your family tree!', body: 'This is the interactive canvas. Each circle is a family member.' },
  { title: 'Tap any person', body: 'Tap a person node to view their profile — name, birth date, photos, and more.' },
  { title: 'Navigate generations', body: 'Use the up / down buttons to scroll between older and newer generations.' },
  { title: 'Drag to rearrange', body: 'Drag any person to reposition them. Positions are saved automatically.' },
  { title: "You're ready!", body: 'Family Heads: use the Admin panel to invite new members and manage relationships.' },
]

interface OnboardingTourProps {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]!
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-rose-500' : 'bg-stone-200'}`}
            />
          ))}
        </div>
        <h2 className="font-bold text-slate-800 text-lg mb-2">{current.title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{current.body}</p>
        <div className="flex gap-2">
          <button
            onClick={onComplete}
            className="flex-1 text-sm text-stone-400 hover:text-stone-600 py-2"
          >
            Skip
          </button>
          <button
            onClick={() => (isLast ? onComplete() : setStep((s) => s + 1))}
            className="flex-1 bg-rose-500 text-white text-sm font-medium rounded-xl py-2 hover:bg-rose-600 transition-colors"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
