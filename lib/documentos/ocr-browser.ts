import type { Worker as OcrWorker } from "tesseract.js";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";

export interface PaginaExtraida {
  pagina: number;
  texto: string;
  confianca: number | null;
  motor: "pdf_texto" | "tesseract_por";
}
export function validarArquivoOcr(bytes: Uint8Array) {
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Use arquivo de até 10 MB.");
  if (new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-") return "pdf";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, n) => bytes[n] === b) && bytes.length > 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(16) * view.getUint32(20) > 20_000_000)
      throw new Error("Imagem muito grande; reduza para até 20 megapixels.");
    return "imagem";
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    // Read dimensions before decoding to reject compressed image bombs.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let n = 2; n + 4 < bytes.length;) {
      if (bytes[n] !== 255) break;
      const marker = bytes[n + 1]!;
      if (marker === 255) {
        n++;
        continue;
      }
      if (marker === 217 || marker === 218) break;
      if (marker === 216 || marker === 1 || (marker >= 208 && marker <= 215)) {
        n += 2;
        continue;
      }
      const size = view.getUint16(n + 2);
      if (size < 2 || n + 2 + size > bytes.length) break;
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        size >= 7
      ) {
        const pixels = view.getUint16(n + 5) * view.getUint16(n + 7);
        if (!pixels || pixels > 20_000_000)
          throw new Error("Imagem muito grande; reduza para até 20 megapixels.");
        return "imagem";
      }
      n += size + 2;
    }
    throw new Error("JPEG inválido ou sem dimensões verificáveis.");
  }
  throw new Error("Envie um PDF, PNG ou JPEG.");
}
/** Somente navegador: arquivo permanece local; modelos/motor são servidos pelo CRM. */
export async function extrairContrato(
  file: File,
  progresso: (texto: string) => void,
  signal: AbortSignal,
): Promise<{ paginas: PaginaExtraida[]; sha256: string }> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Use arquivo de até 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const tipo = validarArquivoOcr(bytes);
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const holder: { worker: OcrWorker | null } = { worker: null };
  let loading: PDFDocumentLoadingTask | null = null;
  let cancelled = false;
  const cancelar = () => {
    cancelled = true;
    void holder.worker?.terminate();
    void loading?.destroy();
  };
  signal.addEventListener("abort", cancelar);
  const conferir = () => {
    if (signal.aborted || cancelled) throw new Error("Leitura cancelada.");
  };
  async function reconhecer(canvas: HTMLCanvasElement) {
    conferir();
    if (!holder.worker) {
      progresso("Preparando OCR em português…");
      const { createWorker } = await import("tesseract.js");
      holder.worker = await createWorker("por", 1, {
        workerPath: "/document-ocr/worker.min.js",
        corePath: "/document-ocr",
        langPath: "/document-ocr",
        cacheMethod: "none",
        workerBlobURL: false,
      });
      if (cancelled) {
        await holder.worker.terminate();
        conferir();
      }
      await holder.worker.setParameters({ user_defined_dpi: "180" });
    }
    conferir();
    const result = await interrompivel(holder.worker.recognize(canvas, {}, { text: true }), signal);
    conferir();
    return {
      texto: result.data.text,
      confianca: result.data.confidence,
      motor: "tesseract_por" as const,
    };
  }
  const canvas = document.createElement("canvas");
  try {
    const paginas: PaginaExtraida[] = [];
    if (tipo === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/document-ocr/pdf.worker.min.mjs";
      loading = pdfjs.getDocument({
        data: bytes.slice(),
        standardFontDataUrl: "/document-ocr/standard_fonts/",
        cMapUrl: "/document-ocr/cmaps/",
        cMapPacked: true,
        wasmUrl: "/document-ocr/wasm/",
      });
      const pdf = await loading.promise;
      if (pdf.numPages > 20) throw new Error("Divida o contrato em arquivos de até 20 páginas.");
      for (let n = 1; n <= pdf.numPages; n++) {
        conferir();
        progresso(`Lendo página ${n} de ${pdf.numPages}…`);
        const page = await pdf.getPage(n);
        try {
          const text = await page.getTextContent();
          const texto = text.items
            .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
            .join("");
          if (texto.trim().length >= 30) {
            paginas.push({ pagina: n, texto, motor: "pdf_texto", confianca: null });
            continue;
          }
          const size = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(2.5, 2400 / Math.max(size.width, size.height)),
          });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
          paginas.push({ pagina: n, ...(await reconhecer(canvas)) });
        } finally {
          page.cleanup();
        }
      }
    } else {
      conferir();
      progresso("Lendo imagem…");
      const image = await createImageBitmap(file);
      try {
        if (image.width * image.height > 20_000_000) throw new Error("Imagem muito grande.");
        const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
        canvas.width = Math.ceil(image.width * scale);
        canvas.height = Math.ceil(image.height * scale);
        const context = canvas.getContext("2d")!;
        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        paginas.push({ pagina: 1, ...(await reconhecer(canvas)) });
      } finally {
        image.close();
      }
    }
    return { paginas, sha256 };
  } finally {
    signal.removeEventListener("abort", cancelar);
    if (!cancelled) await holder.worker?.terminate();
    await loading?.destroy();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function interrompivel<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Leitura cancelada."));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
