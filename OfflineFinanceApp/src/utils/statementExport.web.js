const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildRows = transactions =>
  transactions
    .map(
      item => `
        <tr>
          <td>${escapeHtml(item.dateLabel)}</td>
          <td>${escapeHtml(item.typeLabel)}</td>
          <td>
            <strong>${escapeHtml(item.description)}</strong>
            <span>${escapeHtml(
              item.sku ? `SKU: ${item.sku}` : item.meta || '',
            )}</span>
          </td>
          <td>${escapeHtml(item.paymentLabel)}</td>
          <td class="${
            item.direction === 'in' ? 'credit' : 'debit'
          }">${escapeHtml(item.signedAmountLabel)}</td>
        </tr>`,
    )
    .join('');

export const exportTransactionStatement = async ({
  business,
  closingBalance,
  closingBalanceLabel,
  generatedAtLabel,
  periodLabel,
  transactions,
}) => {
  const statementWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (!statementWindow) {
    console.warn('Allow popups to export this statement as a PDF.');
    return;
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Transaction Statement</title>
    <style>
      * { box-sizing: border-box; }
      body {
        color: #111827;
        font-family: Inter, "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 36px;
      }
      header {
        border-bottom: 2px solid #1f3a5f;
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 22px;
      }
      h1 {
        color: #1f3a5f;
        font-size: 28px;
        margin: 0 0 8px;
      }
      p { margin: 0; }
      .muted { color: #667085; font-size: 12px; }
      .details {
        text-align: right;
      }
      .summary {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, 1fr);
        margin: 24px 0;
      }
      .summary div {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
      }
      .summary strong {
        display: block;
        font-size: 16px;
        margin-top: 5px;
      }
      .balance { color: ${closingBalance >= 0 ? '#12a66a' : '#dc3f2f'}; }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th {
        background: #1f3a5f;
        color: #fff;
        font-size: 11px;
        letter-spacing: .04em;
        padding: 10px;
        text-align: left;
        text-transform: uppercase;
      }
      td {
        border-bottom: 1px solid #e2e8f0;
        font-size: 12px;
        padding: 12px 10px;
        vertical-align: top;
      }
      td strong { display: block; }
      td span {
        color: #667085;
        display: block;
        font-size: 11px;
        margin-top: 3px;
      }
      td:last-child, th:last-child { text-align: right; }
      .credit { color: #12a66a; font-weight: 700; }
      .debit { color: #dc3f2f; font-weight: 700; }
      .empty {
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        color: #667085;
        padding: 24px;
        text-align: center;
      }
      @media print {
        body { padding: 24px; }
      }
    </style>
  </head>
  <body>
    <header>
      <div>
        <p class="muted">BUSINESS DETAILS</p>
        <h1>${escapeHtml(business.name)}</h1>
        <p>TIN: ${escapeHtml(business.tin)}</p>
      </div>
      <div class="details">
        <p class="muted">TRANSACTION STATEMENT</p>
        <p>${escapeHtml(periodLabel)}</p>
        <p class="muted">Generated ${escapeHtml(generatedAtLabel)}</p>
      </div>
    </header>

    <section class="summary">
      <div>
        <p class="muted">Statement Period</p>
        <strong>${escapeHtml(periodLabel)}</strong>
      </div>
      <div>
        <p class="muted">Transactions</p>
        <strong>${transactions.length}</strong>
      </div>
      <div>
        <p class="muted">Closing Balance</p>
        <strong class="balance">${escapeHtml(closingBalanceLabel)}</strong>
      </div>
    </section>

    ${
      transactions.length > 0
        ? `<table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Description</th>
                <th>Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${buildRows(transactions)}</tbody>
          </table>`
        : '<div class="empty">No transactions match the selected filters.</div>'
    }
    <script>
      window.onload = () => {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`;

  statementWindow.document.open();
  statementWindow.document.write(html);
  statementWindow.document.close();
};
