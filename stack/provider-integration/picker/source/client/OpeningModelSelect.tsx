import { useSyncExternalStore } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ModelSelectInjected } from './slots.ts'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { ModelSelect } from './ModelSelect.tsx'
import styles from './ModelSelect.module.css'

/** Additive root surface; never replaces an occupied conversation slot. */
export function OpeningModelSelect(props: ModelSelectInjected & {
  sessions: SnapshotStore<{ current?: string }>, t: TranslateNS<'model'>,
}) {
  const session = useSyncExternalStore(fn => props.sessions.subscribe(fn), () => props.sessions.getSnapshot())
  const state = useSyncExternalStore(fn => props.directory.subscribe(fn), () => props.directory.getSnapshot())
  if (session.current !== undefined) return null
  return <section className={styles.openingDock} aria-label={props.t('opening.label')}>
    <span className={styles.openingLabel}>{props.t('opening.label')}</span>
    <ModelSelect {...props} locked={state.status === 'selecting'} />
    <span className={styles.openingHint}>{props.t('opening.hint')}</span>
    {state.error && <div className={styles.error} role="alert">
      <span>{state.error}</span>
      <button className={styles.retry} onClick={props.load}>{props.t('action.reload')}</button>
    </div>}
  </section>
}
