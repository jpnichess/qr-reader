import { useEffect, useState } from "react";
import "./Validador.css";

export default function ValidadorTickets() {
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jsqr/dist/jsQR.js";
    script.async = true;
    document.body.appendChild(script);

    const initScanner = () => {
      const video = document.getElementById("video");
      const output = document.getElementById("output");
      const startBtn = document.getElementById("startBtn");
      let scanning = false;
      let canvas, ctx;

      startBtn.addEventListener("click", async () => {
        if (scanning) return;
        scanning = true;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          video.srcObject = stream;

          canvas = document.createElement("canvas");
          ctx = canvas.getContext("2d");

          video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            requestAnimationFrame(scanFrame);
          };
        } catch (err) {
          output.textContent =
            "Não foi possível acessar a câmera: " + err.message;
          scanning = false;
        }

        async function scanFrame() {
          if (!scanning) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(
            imageData.data,
            imageData.width,
            imageData.height
          );

          if (code) {
            scanning = false;
            video.srcObject.getTracks().forEach((track) => track.stop());

            // Envia para o backend
            try {
              const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/validar-retirada`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ qr_code: code.data }),
                }
              );
              const data = await response.json();

              if (data.status === "nao_encontrado")
                setMensagem("Ticket não encontrado!");
              else if (data.status === "retirado")
                setMensagem("Produto já retirado!");
              else if (data.status === "validado")
                setMensagem("Ticket validado com sucesso!");
              else setMensagem(data.message || "Erro desconhecido");
            } catch (err) {
              setMensagem("Erro ao validar ticket: " + err.message);
            }
          } else {
            requestAnimationFrame(scanFrame);
          }
        }
      });
    };

    script.onload = initScanner;

    return () => document.body.removeChild(script);
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Validador de Tickets</h1>

        <video id="video" autoPlay playsInline muted className="video"></video>
        <div id="output" className="output">
          Aponte a câmera para o QR Code
        </div>
        {mensagem && <div className="mensagem">{mensagem}</div>}

        <button id="startBtn" className="button">
          Iniciar a câmera
        </button>
      </div>
    </div>
  );
}
