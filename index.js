const srcdocBase = `
<!doctype html>
<html>
<body>
<script>
  const id = "{{ id }}";
  try {
    const result = (new Function(\`{{ src }}\`))();
    window.parent.postMessage({ id, result }, "{{ origin }}")
  } catch(error) {
    window.parent.postMessage({ id, error }, "{{ origin }}")
  }
</script>
</body>
</html>
`;

function genId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(2)))
    .map((n) => n.toString(36))
    .join("");
}

export function sandboxedEval(src) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("style", "display: none;");
  const msgId = genId();
  const escapedSrc = src.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
  const srcdoc = srcdocBase
    .replaceAll("{{ id }}", msgId)
    .replaceAll("{{ src }}", escapedSrc)
    .replaceAll("{{ origin }}", window.location.origin);

  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      if (event.origin !== "null") {
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
      document.body.removeChild(iframe);
    };
    window.addEventListener("message", handleMessage);
    iframe.srcdoc = srcdoc;
    document.body.appendChild(iframe);
  });
}
