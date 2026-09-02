import {createElement,useEffect,useState,useSyncExternalStore} from 'react'

const duration=(ms: number|null)=>ms===null?'unreported':`${(ms/1000).toFixed(2)}s`
const number=(n: number|null|undefined)=>n==null?'unreported':n.toLocaleString('en-US')

/** A slot shadow, not a core fork. Ordinary non-native sessions use the original component. */
export function NativeMetrics(props: any) {
  const {sessionId,directory,load,getOriginal}=props
  const selection=useSyncExternalStore(fn=>directory.subscribe(fn),()=>directory.getSnapshot())
  const [response,setResponse]=useState<any>(null)
  const [error,setError]=useState('')
  useEffect(()=>{load()},[sessionId])
  useEffect(()=>{
    let stopped=false, timer: ReturnType<typeof setTimeout>
    const controller=new AbortController()
    setResponse(null);setError('')
    const poll=async()=>{
      try {
        const res=await fetch(`/halo-dev/cli-metrics?sessionId=${encodeURIComponent(sessionId)}`,{signal:controller.signal,cache:'no-store'})
        if(!res.ok)throw Error(`Metrics unavailable (HTTP ${res.status})`)
        const data=await res.json()
        if(data.version!==1||!Array.isArray(data.runs))throw Error('Unrecognized metrics response')
        if(!stopped){setResponse({sessionId,...data});setError('')}
      }catch(e){if(!stopped)setError(String(e))}
      finally{if(!stopped)timer=setTimeout(poll,3000)}
    }
    void poll()
    return()=>{stopped=true;controller.abort();clearTimeout(timer)}
  },[sessionId])
  const runs=response?.sessionId===sessionId?response.runs:[]
  const native=['claude-cli','codex-cli'].includes(selection.current?.provider)
  if(!native&&!runs.length){const Original=getOriginal();return Original?createElement(Original,props):null}
  const latest=runs.at(-1)
  // Unknown totals stay unknown; report coverage instead of silently adding zeros.
  const reported=runs.filter((r:any)=>r.tokens!==null)
  const sum=(field:string)=>reported.reduce((n:number,r:any)=>n+r.tokens[field],0)
  return <details data-halo-native-metrics style={{fontSize:12,lineHeight:1.6,padding:'5px 12px',overflowWrap:'anywhere',color:'var(--text-secondary, #aaa)'}}>
    <summary style={{cursor:'pointer'}}>
      Native agent{latest?` · last run ${duration(latest.wallMs)} · ${latest.status} · input ${number(latest.tokens?.input)} / output ${number(latest.tokens?.output)}`:' · metrics available after the first run'}
      {error?' · refresh failed (last saved values)':''}
    </summary>
    {error&&<div role="status">{error}</div>}
    {latest&&<>
      <div>{latest.provider} / {latest.model} · finished {latest.finished}</div>
      <div>Input: {number(latest.tokens?.input)} total; {number(latest.tokens?.uncachedInput)} uncached; {number(latest.tokens?.cacheRead)} cache read; {number(latest.tokens?.cacheWrite)} cache write.</div>
      <div>Output: {number(latest.tokens?.output)} total; reasoning {number(latest.tokens?.reasoning)} (included, not added).</div>
      <div>First model message received: {duration(latest.firstModelMessageMs)}. This is complete-message latency, not first-token latency.</div>
      <div>Run time includes startup, inference, and native tools. TTFT, decode tok/s, and separate native tool time: unreported.</div>
      <div>Usage coverage: {latest.usageCoverage}. Session: {runs.length} native runs; usage reported for {reported.length}/{runs.length} — input {number(sum('input'))}, output {number(sum('output'))} across those reported runs.</div>
    </>}
    <div>Native totals are not context occupancy. Local/API turns are excluded. The stock DSH inference footer is replaced here because it measures this adapter's transport, not the native model.</div>
  </details>
}
