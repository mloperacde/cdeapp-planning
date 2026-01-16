import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TrainingCertificate({ 
  employeeName, 
  trainingTitle, 
  completionDate, 
  certificateId,
  nota 
}) {
  const generatePDF = () => {
    // Create certificate HTML
    const certificateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: landscape; margin: 0; }
          body {
            margin: 0;
            padding: 40px;
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .certificate {
            background: white;
            padding: 60px;
            max-width: 900px;
            margin: 0 auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 20px solid #f8f9fa;
            position: relative;
          }
          .border-decoration {
            position: absolute;
            top: 30px;
            left: 30px;
            right: 30px;
            bottom: 30px;
            border: 3px solid #667eea;
            pointer-events: none;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 36px;
            font-weight: bold;
          }
          h1 {
            font-size: 48px;
            color: #667eea;
            margin: 0;
            font-weight: 300;
            letter-spacing: 2px;
          }
          .subtitle {
            font-size: 18px;
            color: #6b7280;
            margin-top: 10px;
          }
          .content {
            text-align: center;
            margin: 40px 0;
          }
          .award-text {
            font-size: 20px;
            color: #374151;
            margin-bottom: 20px;
          }
          .employee-name {
            font-size: 42px;
            color: #1f2937;
            font-weight: bold;
            margin: 20px 0;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            display: inline-block;
          }
          .training-title {
            font-size: 28px;
            color: #4b5563;
            margin: 30px 0;
            font-style: italic;
          }
          .details {
            display: flex;
            justify-content: space-around;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
          }
          .detail-item {
            text-align: center;
          }
          .detail-label {
            font-size: 14px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .detail-value {
            font-size: 18px;
            color: #1f2937;
            font-weight: bold;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 12px;
            color: #9ca3af;
          }
          .certificate-id {
            font-family: 'Courier New', monospace;
            color: #667eea;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="border-decoration"></div>
          <div class="header">
            <div class="logo">🏆</div>
            <h1>CERTIFICADO</h1>
            <p class="subtitle">de Formación Completada</p>
          </div>
          
          <div class="content">
            <p class="award-text">Se certifica que</p>
            <div class="employee-name">${employeeName}</div>
            <p class="award-text">ha completado satisfactoriamente el módulo de formación</p>
            <div class="training-title">"${trainingTitle}"</div>
          </div>
          
          <div class="details">
            <div class="detail-item">
              <div class="detail-label">Fecha de Finalización</div>
              <div class="detail-value">${format(new Date(completionDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</div>
            </div>
            ${nota ? `
            <div class="detail-item">
              <div class="detail-label">Calificación</div>
              <div class="detail-value">${nota}%</div>
            </div>
            ` : ''}
            <div class="detail-item">
              <div class="detail-label">ID Certificado</div>
              <div class="detail-value certificate-id">${certificateId}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Este certificado verifica la finalización del módulo de formación indicado.</p>
            <p>Emitido electrónicamente el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([certificateHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificado_${employeeName.replace(/\s/g, '_')}_${trainingTitle.replace(/\s/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={generatePDF}
      variant="outline"
      size="sm"
      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
    >
      <Award className="w-4 h-4 mr-2" />
      Descargar Certificado
    </Button>
  );
}
