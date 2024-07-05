import express from 'express';
import PDFDocument from 'pdfkit';
import { parseString } from 'xml2js';
import bodyParser from 'body-parser';
import { pipeline } from 'stream';

const app = express();
const port = 3000;

// Middleware para parsear o corpo das requisições como texto
app.use(bodyParser.text({ type: 'application/xml' }));

app.post('/gerar-danfe', (req, res) => {
  const xmlContent = req.body;

  parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Erro ao parsear XML:', err);
      res.status(400).send('Mande o XML correto, está incompleto');
      return;
    }

    const nfe = result.nfeProc.NFe[0].infNFe[0];

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=danfe.pdf');

    // Configurar cabeçalho e rodapé padrão
    const drawHeader = () => {
      doc.fontSize(14).text('DANFE - Documento Auxiliar da Nota Fiscal Eletrônica', { align: 'center' });
      doc.fontSize(12).text(`Chave de Acesso: ${nfe.$.Id}`, { align: 'center' });
      doc.fontSize(10).text('Consulta de autenticidade no portal nacional da NF-e', { align: 'center' });
      doc.moveDown();
    };

    const drawFooter = () => {
      doc.fontSize(10).text('Gerado em 24/06/2024 às 14:33 pelo UniDANFE 3.6.14 Free | www.unidanfe.com.brUniNFe | NF-e OPEN Source | www.uninfe.com.br', { align: 'center' });
    };

    // Desenhar cabeçalho
    drawHeader();

    // Dados do Emitente
    const emit = nfe.emit[0];
    doc.fontSize(10).text('Emitente:', { underline: true });
    doc.text(`Nome: ${emit.xNome[0]}`);
    doc.text(`CNPJ: ${emit.CNPJ[0]}`);
    doc.text(`Endereço: ${emit.enderEmit[0].xLgr[0]}, ${emit.enderEmit[0].nro[0]}, ${emit.enderEmit[0].xCpl[0]}`);
    doc.text(`Bairro: ${emit.enderEmit[0].xBairro[0]}, ${emit.enderEmit[0].xMun[0]} - ${emit.enderEmit[0].UF[0]}`);
    doc.text(`CEP: ${emit.enderEmit[0].CEP[0]}, País: ${emit.enderEmit[0].xPais[0]}`);
    doc.text(`IE: ${emit.IE[0]}`);
    doc.moveDown();

    // Dados do Destinatário
    const dest = nfe.dest[0];
    doc.fontSize(10).text('Destinatário:', { underline: true });
    doc.text(`Nome: ${dest.xNome[0]}`);
    doc.text(`CNPJ: ${dest.CNPJ[0]}`);
    doc.text(`Endereço: ${dest.enderDest[0].xLgr[0]}, ${dest.enderDest[0].nro[0]}, ${dest.enderDest[0].xCpl[0]}`);
    doc.text(`Bairro: ${dest.enderDest[0].xBairro[0]}, ${dest.enderDest[0].xMun[0]} - ${dest.enderDest[0].UF[0]}`);
    doc.text(`CEP: ${dest.enderDest[0].CEP[0]}, País: ${dest.enderDest[0].xPais[0]}`);
    doc.text(`IE: ${dest.IE[0]}`);
    doc.moveDown();

    // Produtos
    doc.fontSize(10).text('Produtos:', { underline: true });
    const det = nfe.det[0];
    const prod = det.prod[0];
    doc.text(`Código: ${prod.cProd[0]}`);
    doc.text(`Descrição: ${prod.xProd[0]}`);
    doc.text(`Quantidade: ${prod.qCom[0]} ${prod.uCom[0]}`);
    doc.text(`Valor Unitário: R$ ${parseFloat(prod.vUnCom[0]).toFixed(2)}`);
    doc.text(`Valor Total: R$ ${parseFloat(prod.vProd[0]).toFixed(2)}`);
    doc.moveDown();

    // Totais
    doc.fontSize(10).text('Totais:', { underline: true });
    const total = nfe.total[0].ICMSTot[0];
    doc.text(`Valor Total dos Produtos: R$ ${parseFloat(total.vProd[0]).toFixed(2)}`);
    doc.text(`Valor Total da Nota: R$ ${parseFloat(total.vNF[0]).toFixed(2)}`);
    doc.moveDown();

    // Transporte
    const transp = nfe.transp[0];
    doc.fontSize(10).text('Transportador / Volumes Transportados:', { underline: true });
    doc.text(`Frete por Conta: ${transp.modFrete[0] === '0' ? 'Emitente' : 'Destinatário'}`);
    const vol = transp.vol[0];
    doc.text(`Espécie: ${vol.esp[0]}`);
    doc.moveDown();

    // Dados Adicionais
    const infAdic = nfe.infAdic[0];
    doc.fontSize(10).text('Dados Adicionais:', { underline: true });
    doc.text(infAdic.infCpl[0]);
    doc.moveDown();

    // Desenhar rodapé
    drawFooter();

    doc.end();

    // Use pipeline para garantir que o PDF seja enviado na resposta
    pipeline(doc, res, (pipelineErr) => {
      if (pipelineErr) {
        console.error('Erro ao enviar o PDF:', pipelineErr);
        res.status(500).send('Erro ao enviar o PDF');
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
