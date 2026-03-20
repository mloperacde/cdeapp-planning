import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

/**
 * Parses markdown headings to build a table of contents.
 */
function extractTOC(markdown = '') {
  const lines = markdown.split('\n');
  const toc = [];
  lines.forEach(line => {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) toc.push({ level: 2, text: h2[1].replace(/[*_`]/g, '').trim() });
    else if (h3) toc.push({ level: 3, text: h3[1].replace(/[*_`]/g, '').trim() });
  });
  return toc;
}

/**
 * Converts simple markdown to styled HTML for printing.
 */
function markdownToHTML(md = '') {
  let html = md
    // headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // blockquotes (⚠️ and 💡 notes)
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // unordered lists
    .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
    // ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ordered">$1</li>')
    // inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // line breaks → paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap loose <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(\s*<br\/>)?)+/g, (match) => {
    const items = match.replace(/<br\/>/g, '');
    return `<ul>${items}</ul>`;
  });

  return `<p>${html}</p>`;
}

export default function TrainingPDFExport({ module }) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!module?.contenido && !module?.objetivos) {
      alert('El módulo no tiene contenido para exportar. Genera el material primero.');
      return;
    }

    setLoading(true);

    const toc = extractTOC(module.contenido || '');
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const tocHTML = toc.length > 0
      ? `<div class="toc">
          <h2 class="toc-title">Índice de Contenidos</h2>
          <ul class="toc-list">
            ${toc.map(item => `<li class="toc-${item.level === 2 ? 'h2' : 'h3'}">${item.text}</li>`).join('')}
          </ul>
        </div>`
      : '';

    const objetivosHTML = module.objetivos
      ? `<div class="section-box">
          <h2>Objetivos de Aprendizaje</h2>
          ${markdownToHTML(module.objetivos)}
        </div>`
      : '';

    const evaluacionHTML = module.evaluacion
      ? `<div class="page-break"></div>
         <div class="section-box eval-section">
          <h2>Evaluación</h2>
          ${markdownToHTML(module.evaluacion)}
        </div>`
      : '';

    const biblioHTML = module.bibliografia
      ? `<div class="section-box biblio-section">
          <h2>Bibliografía y Referencias</h2>
          ${markdownToHTML(module.bibliografia)}
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${module.titulo || 'Módulo de Formación'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #fff;
    }

    /* ── COVER PAGE ── */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%);
      color: white;
      padding: 60px 70px;
      page-break-after: always;
    }
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .cover-company {
      font-size: 13pt;
      font-weight: 600;
      opacity: 0.85;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .cover-code {
      font-size: 10pt;
      opacity: 0.7;
      font-family: monospace;
      background: rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 20px;
    }
    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 0;
    }
    .cover-category {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      opacity: 0.75;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cover-category::before {
      content: '';
      display: inline-block;
      width: 30px;
      height: 2px;
      background: rgba(255,255,255,0.6);
    }
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 24px;
      max-width: 80%;
    }
    .cover-description {
      font-size: 12pt;
      opacity: 0.8;
      max-width: 70%;
      line-height: 1.7;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 30px 0;
      border-top: 1px solid rgba(255,255,255,0.25);
      border-bottom: 1px solid rgba(255,255,255,0.25);
      margin: 30px 0;
    }
    .cover-meta-item label {
      display: block;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.65;
      margin-bottom: 4px;
    }
    .cover-meta-item span {
      font-size: 12pt;
      font-weight: 600;
    }
    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      opacity: 0.65;
    }
    .cover-confidential {
      background: rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 8pt;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* ── TOC ── */
    .toc {
      padding: 50px 70px;
      page-break-after: always;
      min-height: 60vh;
    }
    .toc-title {
      font-size: 18pt;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 3px solid #2563eb;
    }
    .toc-list { list-style: none; }
    .toc-list li { padding: 6px 0; border-bottom: 1px dotted #cbd5e1; }
    .toc-h2 {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      padding-left: 0;
    }
    .toc-h3 {
      font-size: 10pt;
      font-weight: 400;
      color: #475569;
      padding-left: 24px;
    }

    /* ── CONTENT PAGES ── */
    .content {
      padding: 50px 70px;
    }

    h1 { font-size: 22pt; font-weight: 700; color: #1e3a5f; margin: 30px 0 12px; border-bottom: 3px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 15pt; font-weight: 700; color: #1e3a5f; margin: 28px 0 10px; padding-left: 12px; border-left: 4px solid #2563eb; }
    h3 { font-size: 12pt; font-weight: 600; color: #334155; margin: 20px 0 8px; }
    h4 { font-size: 11pt; font-weight: 600; color: #475569; margin: 16px 0 6px; }

    p { margin: 8px 0; }
    ul, ol { margin: 8px 0 8px 24px; }
    li { margin: 4px 0; }

    blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      background: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      border-radius: 0 6px 6px 0;
      font-size: 10.5pt;
      color: #0c4a6e;
    }

    code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 9.5pt;
      font-family: 'Courier New', monospace;
    }

    pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      overflow-x: auto;
    }
    pre code { background: none; color: inherit; padding: 0; }

    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }

    strong { font-weight: 700; color: #0f172a; }
    em { font-style: italic; }

    .section-box {
      margin: 24px 0;
      padding: 20px 24px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .section-box h2 { border-left: none; padding-left: 0; color: #1e3a5f; }

    .eval-section { background: #fefce8; border-color: #fde047; }
    .eval-section h2 { color: #713f12; }
    .biblio-section { background: #f0fdf4; border-color: #86efac; }
    .biblio-section h2 { color: #14532d; }

    /* ── PRINT HEADER / FOOTER ── */
    @media print {
      @page {
        size: A4;
        margin: 20mm 18mm 22mm 18mm;
        @top-right { content: "${module.codigoModulo || 'FORM'}"; font-size: 8pt; color: #94a3b8; }
        @bottom-center { content: counter(page); font-size: 8pt; color: #94a3b8; }
      }
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }

    .page-break { page-break-before: always; }

    /* running header stripe */
    .running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 70px;
      background: #1e3a5f;
      color: white;
      font-size: 8.5pt;
      font-weight: 500;
    }
  </style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-header">
    <div class="cover-company">Material Formativo Interno</div>
    ${module.codigoModulo ? `<div class="cover-code">${module.codigoModulo}</div>` : ''}
  </div>
  <div class="cover-body">
    <div class="cover-category">${module.categoria || 'Formación Industrial'}</div>
    <div class="cover-title">${module.titulo || 'Módulo de Formación'}</div>
    ${module.descripcion ? `<div class="cover-description">${module.descripcion}</div>` : ''}
    <div class="cover-meta">
      <div class="cover-meta-item">
        <label>Nivel</label>
        <span>${module.nivel || '–'}</span>
      </div>
      <div class="cover-meta-item">
        <label>Duración</label>
        <span>${module.duracionHoras ? `${module.duracionHoras}h` : '–'}</span>
      </div>
      <div class="cover-meta-item">
        <label>Departamento</label>
        <span>${module.departamentos?.join(', ') || '–'}</span>
      </div>
      <div class="cover-meta-item">
        <label>Autor</label>
        <span>${module.autor || '–'}</span>
      </div>
    </div>
    ${module.normativaReferencia ? `<div style="font-size:9pt;opacity:0.7;margin-top:8px;">Normativa: ${module.normativaReferencia}</div>` : ''}
  </div>
  <div class="cover-footer">
    <span>${today}</span>
    ${module.periodicidadMeses ? `<span>Renovación cada ${module.periodicidadMeses} meses</span>` : ''}
    <span class="cover-confidential">Uso Interno</span>
  </div>
</div>

<!-- RUNNING HEADER (shown on content pages only, suppressed by print @page) -->
<div class="running-header">
  <span>${module.titulo || 'Módulo de Formación'}</span>
  <span>${module.codigoModulo || ''} · ${today}</span>
</div>

<!-- TABLE OF CONTENTS -->
${tocHTML}

<!-- OBJETIVOS -->
${objetivosHTML ? `<div class="content">${objetivosHTML}</div>` : ''}

<!-- MAIN CONTENT -->
<div class="content">
  ${markdownToHTML(module.contenido || '')}
</div>

<!-- EVALUACIÓN -->
${evaluacionHTML ? `<div class="content">${evaluacionHTML}</div>` : ''}

<!-- BIBLIOGRAFÍA -->
${biblioHTML ? `<div class="content">${biblioHTML}</div>` : ''}

<script>
  window.onload = function() { window.print(); };
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    // Cleanup after print dialog closes
    if (win) {
      win.onafterprint = () => {
        URL.revokeObjectURL(url);
      };
    }

    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Exportar PDF
    </Button>
  );
}