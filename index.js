const srcdoc = (origin, id) => `
<!doctype html>
<html>
<body>
<script>
const origin = "${origin}";
const id = "${id}";
const handleMessage = (event) => {
  if (event.origin !== origin) {
    return;
  }
  const { id: senderId, src, scope } = event.data || {};
  if (id !== senderId) {
    return;
  }
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
  const id = genId();

  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const { id: senderId, result, error, ready } = event.data ?? {};
      if (id !== senderId) {
        return;
      }
      if (ready) {
        iframe.contentWindow.postMessage(
          {
            id,
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

    iframe.srcdoc = srcdoc(window.location.origin, id);
    document.body.appendChild(iframe);
  });
}
