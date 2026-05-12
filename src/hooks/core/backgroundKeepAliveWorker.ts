let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (event: MessageEvent<'start' | 'stop'>) => {
  if (event.data === 'start') {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage('tick');
    }, 250);
    return;
  }

  if (event.data === 'stop') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }
};
