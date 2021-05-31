const iframe = (function initSandboxIframe() {
  const srcdoc = `
<!doctype html>
<html>
<body>
<script>
  window.addEventListener("message", (event) => {
    if (event.origin !== window.origin) {
      return;
    }
    const { id, src, scope } = event.data || {};
    const args = Object.keys(scope);
    args.push(src);
    const values = Object.values(scope);
    try {
      const result = (new Function(...args))(...values);
      window.parent.postMessage({ id, result }, window.origin);
    } catch(error) {
      window.parent.postMessage({ id, error }, window.origin);
    }
  })
</script>
</body>
</html>
`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.setAttribute("style", "display: none;");
  iframe.srcdoc = srcdoc;
  document.body.appendChild(iframe);
  return iframe;
})();

function genId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)))
    .map((n) => n.toString(36))
    .join("");
}

export function sandboxedEval(src, scope = {}) {
  const msgId = genId();

  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      if (
        event.origin !== window.origin ||
        event.source !== iframe.contentWindow
      ) {
        return;
      }
      const { id, result, error } = event.data ?? {};
      if (id !== msgId) {
        return;
      }
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
      window.removeEventListener("message", handleMessage);
    };
    window.addEventListener("message", handleMessage);
    iframe.contentWindow.postMessage(
      {
        id: msgId,
        src,
        scope,
      },
      window.origin
    );
  });
}
