const throttle = function (innerFnc: Function, throttleTimeMs: number) {
  let throttleTimer: any;
  return function (...args: any[]) {
    if (throttleTimer) { return; }
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      innerFnc(...args);
    }, throttleTimeMs);
  };
};

export default throttle;