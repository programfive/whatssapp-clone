'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react'

import { EmojiPicker } from '@/components/ui/emoji-picker'
import { cn } from '@/lib/utils'
import { Send, Smile, X } from 'lucide-react'

type PollDraft = {
  question: string
  options: string[]
  allowMultiple: boolean
}

interface PollCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (payload: PollDraft) => void
}

export const PollCreateModal: FC<PollCreateModalProps> = ({ open, onOpenChange, onSend }) => {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [focusedField, setFocusedField] = useState<'question' | number | null>(null)
  const [emojiPickerOpenFor, setEmojiPickerOpenFor] = useState<'question' | number | null>(null)
  const questionInputRef = useRef<HTMLInputElement | null>(null)
  const optionInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    if (open) return
    setQuestion('')
    setOptions(['', ''])
    setAllowMultiple(false)
    setFocusedField(null)
    setEmojiPickerOpenFor(null)
  }, [open])

  const canSend = useMemo(() => {
    const q = question.trim()
    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    return q.length > 0 && validOptions.length >= 2
  }, [options, question])

  const setOptionAt = useCallback((idx: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }, [])

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      const target = emojiPickerOpenFor

      if (target === 'question') {
        setQuestion((prev) => `${prev}${emoji}`)
        requestAnimationFrame(() => questionInputRef.current?.focus())
        return
      }

      if (typeof target === 'number') {
        const idx = target
        setOptions((prev) => {
          const next = [...prev]
          next[idx] = `${next[idx] ?? ''}${emoji}`
          return next
        })
        requestAnimationFrame(() => optionInputRefs.current[idx]?.focus())
      }
    },
    [emojiPickerOpenFor]
  )

  const addOption = useCallback(() => {
    setOptions((prev) => [...prev, ''])
  }, [])

  const handleSend = useCallback(() => {
    const payload: PollDraft = {
      question: question.trim(),
      options: options.map((o) => o.trim()).filter(Boolean),
      allowMultiple,
    }

    if (!payload.question || payload.options.length < 2) return
    onSend(payload)
    onOpenChange(false)
  }, [allowMultiple, onOpenChange, onSend, options, question])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl dark:bg-[#222e35]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-whatsapp-text-primary">Crea una encuesta</h2>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-whatsapp-text-muted">Pregunta</label>
              <div
                className={cn(
                  'flex items-center gap-2 border-b-2 transition-colors pb-1',
                  focusedField === 'question' ? 'border-whatsapp-forest' : 'border-border/30'
                )}
              >
                <input
                  ref={questionInputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onFocus={() => setFocusedField('question')}
                  onBlur={() => setFocusedField((prev) => (prev === 'question' ? null : prev))}
                  className="h-11 w-full bg-transparent px-0 text-base outline-none text-whatsapp-text-primary placeholder:text-whatsapp-text-muted/50"
                  placeholder="Haz una pregunta"
                  autoFocus
                />

                <EmojiPicker
                  open={emojiPickerOpenFor === 'question'}
                  onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                      setFocusedField('question')
                      setEmojiPickerOpenFor('question')
                      return
                    }
                    setEmojiPickerOpenFor((prev) => (prev === 'question' ? null : prev))
                  }}
                  onSelect={handleSelectEmoji}
                >
                  <button
                    type="button"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-whatsapp-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </EmojiPicker>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-whatsapp-text-muted">Opciones</label>
              <div className="space-y-4">
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-2 border-b-2 transition-colors pb-1',
                      focusedField === idx ? 'border-whatsapp-forest' : 'border-border/30'
                    )}
                  >
                    <input
                      ref={(el) => {
                        optionInputRefs.current[idx] = el
                      }}
                      value={opt}
                      onChange={(e) => setOptionAt(idx, e.target.value)}
                      onFocus={() => setFocusedField(idx)}
                      onBlur={() => setFocusedField((prev) => (prev === idx ? null : prev))}
                      className="h-11 w-full bg-transparent px-0 text-base outline-none text-whatsapp-text-primary placeholder:text-whatsapp-text-muted/50"
                      placeholder={idx === 0 ? 'Añade una opción' : 'Añade otra opción'}
                    />

                    <EmojiPicker
                      open={emojiPickerOpenFor === idx}
                      onOpenChange={(nextOpen) => {
                        if (nextOpen) {
                          setFocusedField(idx)
                          setEmojiPickerOpenFor(idx)
                          return
                        }
                        setEmojiPickerOpenFor((prev) => (prev === idx ? null : prev))
                      }}
                      onSelect={handleSelectEmoji}
                    >
                      <button
                        type="button"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-whatsapp-text-muted hover:bg-black/5 dark:hover:bg-white/5"
                        aria-label="Emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                    </EmojiPicker>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-2 text-sm font-medium text-whatsapp-forest hover:opacity-80 transition-opacity"
                >
                  <span>+ Añadir opción</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-whatsapp-text-primary">Permitir varias respuestas</span>
              <button
                type="button"
                onClick={() => setAllowMultiple((v) => !v)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors duration-200 outline-none',
                  allowMultiple ? 'bg-whatsapp-forest' : 'bg-whatsapp-text-muted/30'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 shadow-sm',
                    allowMultiple ? 'left-[22px]' : 'left-0.5'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="order-2 sm:order-1 px-6 py-2.5 text-sm font-bold text-whatsapp-forest hover:bg-whatsapp-forest/5 rounded-full transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'order-1 sm:order-2 px-8 py-2.5 text-sm font-bold text-white rounded-full transition-all shadow-md',
                canSend
                  ? 'bg-whatsapp-forest hover:bg-whatsapp-forest-dark active:scale-[0.98]'
                  : 'bg-whatsapp-text-muted/20 text-whatsapp-text-muted/50 cursor-not-allowed shadow-none'
              )}
            >
              Crear encuesta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
