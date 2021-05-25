const iframeSrcDoc = `
<!doctype html>
<html>
<body>
<script>
  try {
    const result = (new Function(\`{{ src }}\`))();
    window.parent.postMessage({ result }, "{{ origin }}")
  } catch(error) {
    window.parent.postMessage({ error }, "{{ origin }}")
  }
</script>
</body>
</html>
`;

function sandboxedEval(src) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("style", "display: none");
  return new Promise((resolve, reject) => {
    const handleMessage = (event) => {
      const { result, error } = event.data;
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
      window.removeEventListener("message", handleMessage);
      document.body.removeChild(iframe);
    };
    window.addEventListener("message", handleMessage);
    const escapedSrc = src.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
    iframe.srcdoc = iframeSrcDoc
      .replaceAll("{{ src }}", escapedSrc)
      .replaceAll("{{ origin }}", window.location.origin);
    document.body.appendChild(iframe);
  });
}

export { sandboxedEval };
