/** Resolves after `ms` milliseconds: the mocks' simulated latency. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
