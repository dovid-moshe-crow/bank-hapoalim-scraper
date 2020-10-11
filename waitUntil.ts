export function waitUntil(
  asyncTest: () => Promise<any>,
  description = "",
  timeout = 10000,
  interval = 100
) {
  const promise = new Promise((resolve, reject) => {
    function wait() {
      asyncTest()
        .then((value) => {
          if (value === true) {
            resolve();
          } else {
            setTimeout(wait, interval);
          }
        })
        .catch(() => {
          reject();
        });
    }
    wait();
  });
  return timeoutPromise(timeout, promise, description);
}

function timeoutPromise(
  ms: number,
  promise: Promise<any>,
  description: string
) {
  const timeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      const error = new Error(description);
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeout]);
}
