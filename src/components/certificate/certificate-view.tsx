"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificateData {
  id: string;
  name: string;
  syllabus: string;
  issuedAt: string;
  verifyUrl: string;
}

async function loadAsBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function generatePdf(cert: CertificateData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  // PT Sans covers Cyrillic — jsPDF's built-in fonts do not.
  const [regular, bold, logo] = await Promise.all([
    loadAsBase64("/fonts/PTSans-Regular.ttf"),
    loadAsBase64("/fonts/PTSans-Bold.ttf"),
    loadAsBase64("/logo.png"),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.addFileToVFS("PTSans-Regular.ttf", regular);
  doc.addFont("PTSans-Regular.ttf", "PTSans", "normal");
  doc.addFileToVFS("PTSans-Bold.ttf", bold);
  doc.addFont("PTSans-Bold.ttf", "PTSans", "bold");

  const W = 297;
  const H = 210;
  const cx = W / 2;

  // Frame
  doc.setFillColor(250, 250, 249);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(23, 23, 23);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, W - 26, H - 26);

  doc.addImage(logo, "PNG", cx - 12, 17, 24, 24);

  doc.setFont("PTSans", "bold");
  doc.setTextColor(23, 23, 23);
  doc.setFontSize(13);
  doc.text("IBDP COMPUTER SCIENCE", cx, 50, { align: "center" });

  doc.setFontSize(34);
  doc.text("ГЭРЧИЛГЭЭ", cx, 70, { align: "center" });
  doc.setFont("PTSans", "normal");
  doc.setFontSize(14);
  doc.setTextColor(120, 113, 108);
  doc.text("Certificate of Completion", cx, 79, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(23, 23, 23);
  doc.text("Энэхүү гэрчилгээг", cx, 100, { align: "center" });

  doc.setFont("PTSans", "bold");
  doc.setFontSize(28);
  doc.text(cert.name, cx, 115, { align: "center" });
  const nameWidth = doc.getTextWidth(cert.name);
  doc.setLineWidth(0.4);
  doc.line(cx - nameWidth / 2 - 5, 119, cx + nameWidth / 2 + 5, 119);

  doc.setFont("PTSans", "normal");
  doc.setFontSize(13);
  const body = `${cert.syllabus} хөтөлбөрийн бүх модулийг амжилттай дүүргэсэн тул олгов.`;
  doc.text(doc.splitTextToSize(body, 180), cx, 132, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Олгосон огноо: ${cert.issuedAt}`, cx, 157, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(120, 113, 108);
  doc.text(`Verification ID: ${cert.id}`, cx, 185, { align: "center" });
  doc.text(cert.verifyUrl, cx, 190, { align: "center" });

  doc.save(`IBDP-CS-Certificate-${cert.id}.pdf`);
}

export function CertificateView({ cert }: { cert: CertificateData }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Two-sided confetti burst on mount.
    const end = Date.now() + 1500;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      await generatePdf(cert);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* On-screen preview mirroring the PDF */}
      <div className="rounded-xl border-4 border-double border-foreground/70 bg-background p-8 text-center sm:p-12">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          IBDP Computer Science
        </p>
        <h2 className="mt-4 text-3xl font-bold">ГЭРЧИЛГЭЭ</h2>
        <p className="text-sm text-muted-foreground">Certificate of Completion</p>
        <p className="mt-8 text-sm">Энэхүү гэрчилгээг</p>
        <p className="mt-2 inline-block border-b-2 border-foreground px-4 pb-1 text-2xl font-bold">
          {cert.name}
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm">
          {cert.syllabus} хөтөлбөрийн бүх модулийг амжилттай дүүргэсэн тул
          олгов.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Олгосон огноо: {cert.issuedAt}
        </p>
        <p className="mt-8 text-xs text-muted-foreground">
          Verification ID: {cert.id}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Button onClick={download} disabled={downloading} size="lg">
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          PDF татах
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
