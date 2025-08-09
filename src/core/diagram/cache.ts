import { DiagramRenderer, DiagramRenderResult } from './diagramRenderer';
import { trackUsage } from '../../analytics';

export class DiagramCache {
  private store = new Map<string, DiagramRenderResult>();
  private hits = 0; private misses = 0;
  constructor(private maxEntries = 100) {}
  stats(){ return { hits: this.hits, misses: this.misses, size: this.store.size }; }
  private makeKey(engine: string, code: string){ return engine+':'+hash(code); }
  get(engine: string, code: string){
    const k = this.makeKey(engine, code);
    const v = this.store.get(k);
    if (v) { this.hits++; trackUsage('diagram.cache', { event: 'hit', engine }); } else { this.misses++; trackUsage('diagram.cache', { event: 'miss', engine }); }
    return v;
  }
  set(result: DiagramRenderResult, code: string){
    const k = this.makeKey(result.engine, code);
    if(!this.store.has(k) && this.store.size >= this.maxEntries){
      const iter = this.store.keys().next();
      if(!iter.done) {
        const firstKey = iter.value as string;
        this.store.delete(firstKey);
      }
    }
    this.store.set(k, result);
  }
}
export class CachedDiagramRenderer implements DiagramRenderer {
  constructor(private inner: DiagramRenderer, private cache: DiagramCache) {}
  engine(){ return this.inner.engine(); }
  async render(code: string){
    const start = Date.now();
    const cached = this.cache.get(this.engine(), code);
    if(cached){ return { ...cached, fromCache: true }; }
    const r = await this.inner.render(code);
    const duration = Date.now() - start;
    trackUsage('diagram.render', { engine: r.engine, durationMs: duration });
    this.cache.set(r, code);
    return r;
  }
}
function hash(str: string){ let h=0,i=0; while(i<str.length){ h = (h<<5)-h + str.charCodeAt(i++) |0; } return h.toString(16); }
