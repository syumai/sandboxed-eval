const srcdoc = `
<!doctype html>
<html>
<body>
<script>
const origin = "{{ origin }}";
const id = "{{ id }}"
const handleMessage = (event) => {
  if (event.origin !== origin) {
    return;
  }
  const { src, scope } = event.data || {};
  const args = Object.keys(scope);
  args.push(src);
  const values = Object.values(scope);
  try {
    const result = new Function(...args)(...values);
    window.parent.postMessage({ id, result }, origin);
  } catch (error) {
    window.parent.postMessage({ id, error }, origin);
  }
  window.removeEventListener("message", handleMessage);
};
window.addEventListener("message", handleMessage);
window.parent.postMessage({ id, ready: true }, origin);
</script>
</body>
</html>
`;

function genId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)))
    .map((n) => n.toString(36))
    .join("");
}

export function sandboxedEval(src, scope = {}) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("style", "display: none;");
  const msgId = genId();

  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const { id, result, error, ready } = event.data ?? {};
      if (id !== msgId) {
        return;
      }
      if (ready) {
        iframe.contentWindow.postMessage(
          {
            id: msgId,
            src,
            scope,
          },
          "*"
        );
        return;
      }
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
      window.removeEventListener("message", handleMessage);
      document.body.removeChild(iframe);
    };
    window.addEventListener("message", handleMessage);

    iframe.srcdoc = srcdoc
      .replace("{{ origin }}", window.location.origin)
      .replace("{{ id }}", msgId);
    document.body.appendChild(iframe);
  });
}
