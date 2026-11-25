const EMBED_CACHE_VERSION = 'v5-resmlp';

/**
 * Periodic background pre-scraper and pre-embedding worker.
 * Warms SQLite `embedding_cache` in low-concurrency batches so interactive user searches return quickly.
 */
export function createBackgroundWorker({
  collectSources,
  syncDiscoveredFacebookGroups,
  getDiscoveredFacebookGroups,
  matchingEmbedding,
  cacheStore,
  intervalMs = 20 * 60_000,
  startupDelayMs = 25_000,
  maxNewPerRun = 40
}) {
  const status = {
    enabled: process.env.DISABLE_BG_WORKER !== '1',
    running: false,
    runsCompleted: 0,
    lastRunAt: null,
    lastDurationMs: 0,
    lastPostsScanned: 0,
    lastCachedNewVectors: 0,
    lastError: ''
  };
  let timer = null, startTimer = null;

  async function runOnce() {
    if (status.running) return status;
    status.running = true;
    status.lastError = '';
    const t0 = Date.now();
    let newCached = 0;
    try {
      const collected = await collectSources('unknown');
      try { syncDiscoveredFacebookGroups(getDiscoveredFacebookGroups()); } catch {}
      const posts = collected.posts || [];
      status.lastPostsScanned = posts.length;

      for (const post of posts) {
        if (newCached >= maxNewPerRun) break;
        const model = ['dog', 'cat'].includes(post.species) ? 'pet-base' : 'dino-bird';
        const key = `${EMBED_CACHE_VERSION}:${model}:${post.species}:${post.image}`;
        if (cacheStore.get(key)) continue;
        try {
          const response = await fetch(post.image, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) continue;
          const bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 5_000_000) continue;
          const vec = await matchingEmbedding(bytes, model, post.species);
          cacheStore.set(key, model, post.species, vec);
          newCached++;
          // Brief cooperative yield so interactive HTTP requests remain responsive.
          await new Promise((resolve) => setTimeout(resolve, 120));
        } catch {}
      }
      status.lastCachedNewVectors = newCached;
      status.runsCompleted++;
    } catch (error) {
      status.lastError = error.message || 'Background warm failed';
    } finally {
      status.running = false;
      status.lastRunAt = new Date().toISOString();
      status.lastDurationMs = Date.now() - t0;
    }
    return status;
  }

  function start() {
    if (!status.enabled) return;
    startTimer = setTimeout(() => {
      runOnce().catch(() => {});
      timer = setInterval(() => { runOnce().catch(() => {}); }, intervalMs);
      timer.unref?.();
    }, startupDelayMs);
    startTimer.unref?.();
  }

  function stop() {
    clearTimeout(startTimer);
    clearInterval(timer);
  }

  return { start, stop, runOnce, getStatus: () => ({ ...status }) };
}
