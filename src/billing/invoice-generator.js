import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { getDb, runQuery, runExec } from '../db/database.js';
import config from '../../config.js';

const INVOICES_DIR = './data/invoices';

/**
 * Invoice system for autónoma in Spain.
 *
 * Flow:
 * 1. Generate PROFORMA (quote) → send to client
 * 2. Client pays via bank transfer
 * 3. Confirm payment → generate FACTURA (real invoice)
 *
 * Spanish tax rules for autónomos:
 * - IVA: 21% on services
 * - IRPF: 7% first 2 years, then 15% (retention on invoice)
 */

// Ensure DB table exists
export async function initBillingTables() {
  const db = await getDb();
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      type TEXT DEFAULT 'proforma',
      invoice_number TEXT UNIQUE,
      client_name TEXT,
      client_nif TEXT,
      client_address TEXT,
      concept TEXT,
      base_amount REAL,
      iva_amount REAL,
      irpf_amount REAL,
      total_amount REAL,
      status TEXT DEFAULT 'pending',
      payment_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id)
    )
  `);
}

/**
 * Generate a proforma (quote) for a business.
 */
export async function generateProforma(businessId, options = {}) {
  await initBillingTables();

  const { earlyBird = false, clientName, clientNif, clientAddress } = options;

  const [biz] = runQuery('SELECT * FROM businesses WHERE id = ?', [businessId]);
  if (!biz) throw new Error('Negocio no encontrado');

  const baseAmount = earlyBird ? config.pricing.earlyBird : config.pricing.standard;
  const ivaAmount = baseAmount * config.invoice.ivaRate;
  const irpfAmount = baseAmount * config.invoice.irpfRate;
  const totalAmount = baseAmount + ivaAmount - irpfAmount;

  const year = new Date().getFullYear();
  const count = runQuery(
    "SELECT COUNT(*) as c FROM invoices WHERE type = 'proforma' AND invoice_number LIKE ?",
    [`P-${year}%`]
  )[0].c;

  const invoiceNumber = `P-${year}-${String(count + 1).padStart(4, '0')}`;
  const concept = `Diseño y desarrollo de página web para ${biz.name}`;

  runExec(
    `INSERT INTO invoices (business_id, type, invoice_number, client_name, client_nif, client_address, concept, base_amount, iva_amount, irpf_amount, total_amount)
     VALUES (?, 'proforma', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [businessId, invoiceNumber, clientName || biz.name, clientNif || '', clientAddress || biz.address || '', concept, baseAmount, ivaAmount, irpfAmount, totalAmount]
  );

  const html = buildInvoiceHTML({
    type: 'proforma',
    number: invoiceNumber,
    date: new Date().toLocaleDateString('es-ES'),
    client: { name: clientName || biz.name, nif: clientNif || '', address: clientAddress || biz.address || '' },
    concept,
    baseAmount,
    ivaAmount,
    irpfAmount,
    totalAmount,
    business: biz,
  });

  if (!existsSync(INVOICES_DIR)) mkdirSync(INVOICES_DIR, { recursive: true });
  const filePath = `${INVOICES_DIR}/${invoiceNumber}.html`;
  writeFileSync(filePath, html, 'utf-8');

  // Update business status
  runExec(
    "UPDATE businesses SET status = 'proforma_sent', updated_at = datetime('now') WHERE id = ?",
    [businessId]
  );

  return { invoiceNumber, filePath, totalAmount, baseAmount };
}

/**
 * Convert a proforma to a real invoice after payment confirmation.
 */
export async function confirmPaymentAndInvoice(proformaNumber) {
  await initBillingTables();

  const [proforma] = runQuery(
    "SELECT * FROM invoices WHERE invoice_number = ? AND type = 'proforma'",
    [proformaNumber]
  );
  if (!proforma) throw new Error('Proforma no encontrada');

  const year = new Date().getFullYear();
  const count = runQuery(
    "SELECT COUNT(*) as c FROM invoices WHERE type = 'factura' AND invoice_number LIKE ?",
    [`F-${year}%`]
  )[0].c;

  const facturaNumber = `F-${year}-${String(count + 1).padStart(4, '0')}`;

  // Create the real invoice
  runExec(
    `INSERT INTO invoices (business_id, type, invoice_number, client_name, client_nif, client_address, concept, base_amount, iva_amount, irpf_amount, total_amount, status, payment_date)
     VALUES (?, 'factura', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', datetime('now'))`,
    [proforma.business_id, facturaNumber, proforma.client_name, proforma.client_nif, proforma.client_address, proforma.concept, proforma.base_amount, proforma.iva_amount, proforma.irpf_amount, proforma.total_amount]
  );

  // Mark proforma as converted
  runExec(
    "UPDATE invoices SET status = 'converted' WHERE invoice_number = ?",
    [proformaNumber]
  );

  // Update business status
  runExec(
    "UPDATE businesses SET status = 'paid', updated_at = datetime('now') WHERE id = ?",
    [proforma.business_id]
  );

  const html = buildInvoiceHTML({
    type: 'factura',
    number: facturaNumber,
    date: new Date().toLocaleDateString('es-ES'),
    client: { name: proforma.client_name, nif: proforma.client_nif, address: proforma.client_address },
    concept: proforma.concept,
    baseAmount: proforma.base_amount,
    ivaAmount: proforma.iva_amount,
    irpfAmount: proforma.irpf_amount,
    totalAmount: proforma.total_amount,
  });

  const filePath = `${INVOICES_DIR}/${facturaNumber}.html`;
  writeFileSync(filePath, html, 'utf-8');

  return { facturaNumber, filePath };
}

function buildInvoiceHTML(data) {
  const inv = config.invoice;
  const isProforma = data.type === 'proforma';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isProforma ? 'Proforma' : 'Factura'} ${data.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid ${isProforma ? '#6366f1' : '#22c55e'}; }
    .header h1 { font-size: 28px; color: ${isProforma ? '#6366f1' : '#22c55e'}; }
    .header .number { font-size: 14px; color: #666; margin-top: 4px; }
    ${isProforma ? '.proforma-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 8px; }' : ''}
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .party h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 1px; }
    .party p { font-size: 14px; line-height: 1.6; }
    .party .name { font-weight: 600; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
    td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .totals { width: 300px; margin-left: auto; }
    .totals tr td { padding: 8px 16px; }
    .totals .label { text-align: right; color: #666; }
    .totals .total-row td { font-weight: 700; font-size: 18px; border-top: 2px solid #1a1a1a; padding-top: 12px; }
    .payment-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-top: 30px; }
    .payment-info h3 { color: #166534; margin-bottom: 10px; font-size: 14px; }
    .payment-info p { font-size: 13px; line-height: 1.8; }
    .notes { margin-top: 30px; font-size: 12px; color: #999; line-height: 1.6; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${isProforma ? 'PROFORMA' : 'FACTURA'}</h1>
      <div class="number">N.º ${data.number}</div>
      ${isProforma ? '<div class="proforma-badge">PRESUPUESTO - SIN VALOR FISCAL</div>' : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:14px;color:#666">Fecha</div>
      <div style="font-size:16px;font-weight:600">${data.date}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Emisor</h3>
      <p class="name">${inv.businessName || '[Nombre pendiente]'}</p>
      <p>NIF: ${inv.nif || '[NIF pendiente]'}</p>
      <p>${inv.address || '[Dirección pendiente]'}</p>
      <p>${inv.postalCode || ''} ${inv.city || ''}</p>
      ${inv.email ? `<p>${inv.email}</p>` : ''}
    </div>
    <div class="party">
      <h3>Cliente</h3>
      <p class="name">${data.client.name}</p>
      ${data.client.nif ? `<p>NIF/CIF: ${data.client.nif}</p>` : ''}
      ${data.client.address ? `<p>${data.client.address}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="text-align:right">Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          ${data.concept}
          <div style="font-size:12px;color:#666;margin-top:4px">
            Incluye: diseño web profesional, responsive, 2 semanas de ajustes, entrega de accesos
          </div>
        </td>
        <td style="text-align:right">${data.baseAmount.toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="label">Base imponible</td><td style="text-align:right">${data.baseAmount.toFixed(2)} €</td></tr>
    <tr><td class="label">IVA (${(config.invoice.ivaRate * 100).toFixed(0)}%)</td><td style="text-align:right">+${data.ivaAmount.toFixed(2)} €</td></tr>
    <tr><td class="label">IRPF (${(config.invoice.irpfRate * 100).toFixed(0)}%)</td><td style="text-align:right">-${data.irpfAmount.toFixed(2)} €</td></tr>
    <tr class="total-row"><td class="label">TOTAL</td><td style="text-align:right">${data.totalAmount.toFixed(2)} €</td></tr>
  </table>

  <div class="payment-info">
    <h3>Datos para transferencia bancaria</h3>
    <p>
      <strong>Titular:</strong> ${inv.businessName || '[Pendiente]'}<br>
      <strong>IBAN:</strong> ${inv.iban || '[Pendiente]'}<br>
      <strong>Banco:</strong> ${inv.bankName || '[Pendiente]'}<br>
      <strong>Concepto:</strong> ${data.number}
    </p>
  </div>

  <div class="notes">
    ${isProforma
      ? 'Este documento es un presupuesto/proforma y no tiene validez fiscal. La factura oficial se emitirá una vez confirmado el pago.'
      : `Factura emitida conforme a la normativa vigente. Forma de pago: transferencia bancaria.`
    }
  </div>
</body>
</html>`;
}

/**
 * Get pricing breakdown for a given amount.
 */
export function getPricingBreakdown(earlyBird = false) {
  const base = earlyBird ? config.pricing.earlyBird : config.pricing.standard;
  const iva = base * config.invoice.ivaRate;
  const irpf = base * config.invoice.irpfRate;
  const total = base + iva - irpf;

  return {
    base,
    iva,
    irpf,
    total,
    ivaRate: config.invoice.ivaRate,
    irpfRate: config.invoice.irpfRate,
    formatted: `${base}€ + IVA (${iva.toFixed(2)}€) - IRPF (${irpf.toFixed(2)}€) = ${total.toFixed(2)}€`,
  };
}
