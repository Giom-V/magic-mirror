export function printImage(image: string) {
  console.log("Using tool: printImage");

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const pri = iframe.contentWindow;
  if (pri) {
    pri.document.open();
    pri.document.write('<html><head><title>Print</title></head><body></body></html>');
    pri.document.close();
    const img = pri.document.createElement("img");
    img.src = image;
    img.onload = function() {
      pri.focus();
      pri.print();
      document.body.removeChild(iframe);
    };
    pri.document.body.appendChild(img);
  } else {
      document.body.removeChild(iframe);
  }
}
