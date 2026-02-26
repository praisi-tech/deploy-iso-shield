/**
 * ISO Shield — PDF Export Utility
 * Renders the exact same HTML as ReportPreview using html2canvas → jsPDF.
 *
 * Fix: Uses clone+translate approach for reliable multi-page slicing.
 * The previous scrollY method caused content duplication and blank pages.
 */

import type { AuditReport, ReportSnapshot } from '@/types/phase3'
import { formatDate, formatSector, formatExposureLevel } from '@/lib/utils'

const SEV_COLORS: Record<string, string> = {
  critical:      '#ef4444',
  high:          '#f97316',
  medium:        '#eab308',
  low:           '#22c55e',
  informational: '#3b82f6',
}

const OPINION_CFG: Record<string, { label: string; barColor: string }> = {
  certified:     { label: 'Certified',     barColor: '#10b981' },
  conditional:   { label: 'Conditional',   barColor: '#eab308' },
  not_certified: { label: 'Not Certified', barColor: '#ef4444' },
}

function bar(count: number, total: number, color: string, label: string): string {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
      <span style="width:82px;color:#64748b;font-size:12px;flex-shrink:0;">${label}</span>
      <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
      </div>
      <span style="width:28px;text-align:right;font-weight:700;font-size:13px;color:#0f172a;">${count}</span>
    </div>`
}

function buildHTML(report: AuditReport, findings: any[]): string {
  const snap = report.snapshot as ReportSnapshot & {
    assets: any; risks: any; compliance: any; findings: any; organization: any
  }
  const opinion = report.final_opinion ? OPINION_CFG[report.final_opinion] : null
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 }
  const sorted = [...findings].sort((a, b) => (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5))
  const compScore: number = snap?.compliance?.score ?? 0
  const compColor = compScore >= 80 ? '#10b981' : compScore >= 50 ? '#f59e0b' : '#ef4444'

  const metaRows = [
    ['Organization', snap?.organization?.name ?? '—'],
    ['Sector',       snap?.organization?.sector ? formatSector(snap.organization.sector) : '—'],
    ['Audit Date',   report.audit_date ? formatDate(report.audit_date) : '—'],
    ['Auditor',      report.auditor_name ?? '—'],
    ['Version',      `v${report.version}`],
    ['Next Audit',   report.next_audit_date ? formatDate(report.next_audit_date) : '—'],
  ]

  const scopeRows = snap?.organization ? [
    ['Organization',       snap.organization.name ?? '—'],
    ['Sector',             formatSector(snap.organization.sector)],
    ['Employees',          snap.organization.employee_count?.toString() ?? '—'],
    ['Exposure Level',     formatExposureLevel(snap.organization.exposure_level)],
    ['Audit Period Start', snap.organization.audit_period_start ? formatDate(snap.organization.audit_period_start) : '—'],
    ['Audit Period End',   snap.organization.audit_period_end   ? formatDate(snap.organization.audit_period_end)   : '—'],
  ] : []

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #0f172a;
    line-height: 1.6;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow: visible;
  }
  h2 { font-size: 18px; font-weight: 700; color: #0f172a; border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-bottom: 16px; }
  h3 { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; }
  section { margin-bottom: 36px; }
  p { margin: 0; }
  table { border-collapse: collapse; }
</style>
</head>
<body>

<!-- ══════════════ COVER PAGE ══════════════ -->
<div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:white;width:794px;height:1123px;padding:56px 48px;display:flex;flex-direction:column;justify-content:space-between;flex-shrink:0;">

  <div style="display:flex;align-items:center;gap:12px;">
    <div style="width:44px;height:44px;background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.4);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;">🛡️</div>
    <span style="font-size:22px;font-weight:700;color:white;">ISO Shield</span>
  </div>

  <div>
    <p style="color:#818cf8;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:18px;">ISO 27001 Security Audit Report</p>
    <h1 style="font-size:36px;font-weight:800;line-height:1.15;margin-bottom:24px;color:white;">${report.title}</h1>
    <div style="width:64px;height:4px;background:#6366f1;border-radius:2px;margin-bottom:36px;"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;max-width:520px;">
      ${metaRows.map(([label, value]) => `
        <div>
          <p style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;">${label}</p>
          <p style="color:#f1f5f9;font-size:14px;font-weight:600;">${value}</p>
        </div>`).join('')}
    </div>
  </div>

  ${opinion ? `
  <div style="display:inline-flex;align-items:center;gap:10px;border:1.5px solid ${opinion.barColor};border-radius:24px;padding:10px 22px;color:${opinion.barColor};width:fit-content;">
    <span style="font-size:16px;">${opinion.label === 'Certified' ? '✅' : opinion.label === 'Conditional' ? '⚠️' : '❌'}</span>
    <span style="font-weight:700;font-size:14px;">Final Opinion: ${opinion.label}</span>
  </div>` : '<div></div>'}
</div>

<!-- ══════════════ BODY ══════════════ -->
<div style="padding:48px;background:white;width:794px;">

  <!-- 1. Executive Summary -->
  <section>
    <h2>1. Executive Summary</h2>
    <p style="color:#374151;line-height:1.85;margin-bottom:22px;">${report.executive_summary || 'No executive summary provided.'}</p>

    ${snap ? `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
      ${[
        { label: 'Total Assets', value: snap.assets?.total ?? 0,  sub: `${snap.assets?.critical ?? 0} critical` },
        { label: 'Risk Items',   value: snap.risks?.total ?? 0,   sub: `${(snap.risks?.critical ?? 0) + (snap.risks?.high ?? 0)} critical/high` },
        { label: 'Compliance',   value: `${compScore}%`,           sub: `${snap.compliance?.coverage ?? 0}% assessed`, color: compColor },
        { label: 'Findings',     value: snap.findings?.total ?? 0, sub: `${snap.findings?.open ?? 0} open` },
      ].map(({ label, value, sub, color }) => `
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:800;color:${color ?? '#0f172a'};margin-bottom:3px;">${value}</p>
          <p style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;">${label}</p>
          <p style="font-size:10px;color:#94a3b8;margin-top:3px;">${sub}</p>
        </div>`).join('')}
    </div>` : ''}
  </section>

  <!-- 2. Scope -->
  <section>
    <h2>2. Scope</h2>
    ${scopeRows.length ? `
    <table style="width:100%;margin-bottom:14px;">
      <tbody>
        ${scopeRows.map(([k, v]) => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 14px 8px 0;color:#64748b;font-weight:600;width:190px;font-size:12px;">${k}</td>
            <td style="padding:8px 0;color:#0f172a;font-size:13px;">${v}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}
    ${snap?.organization?.scope_description ? `
    <p style="color:#374151;background:#f8fafc;padding:16px;border-radius:8px;border-left:3px solid #6366f1;line-height:1.75;">${snap.organization.scope_description}</p>` : ''}
  </section>

  <!-- 3. Methodology -->
  ${report.methodology ? `
  <section>
    <h2>3. Methodology</h2>
    <p style="color:#374151;line-height:1.85;">${report.methodology}</p>
  </section>` : ''}

  <!-- 4. Risk Assessment -->
  ${snap ? `
  <section>
    <h2>4. Risk Assessment Results</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;">
      <div>
        <h3>Asset Inventory (${snap.assets?.total ?? 0})</h3>
        ${bar(snap.assets?.critical ?? 0, snap.assets?.total ?? 1, '#ef4444', 'Critical')}
        ${bar(snap.assets?.high     ?? 0, snap.assets?.total ?? 1, '#f97316', 'High')}
        ${bar(snap.assets?.medium   ?? 0, snap.assets?.total ?? 1, '#eab308', 'Medium')}
        ${bar(snap.assets?.low      ?? 0, snap.assets?.total ?? 1, '#22c55e', 'Low')}
      </div>
      <div>
        <h3>Risk Distribution (${snap.risks?.total ?? 0})</h3>
        ${bar(snap.risks?.critical   ?? 0, snap.risks?.total ?? 1, '#ef4444', 'Critical')}
        ${bar(snap.risks?.high       ?? 0, snap.risks?.total ?? 1, '#f97316', 'High')}
        ${bar(snap.risks?.medium     ?? 0, snap.risks?.total ?? 1, '#eab308', 'Medium')}
        ${bar(snap.risks?.low        ?? 0, snap.risks?.total ?? 1, '#22c55e', 'Low')}
        ${bar(snap.risks?.negligible ?? 0, snap.risks?.total ?? 1, '#94a3b8', 'Negligible')}
      </div>
    </div>
  </section>` : ''}

  <!-- 5. Compliance -->
  ${snap ? `
  <section>
    <h2>5. ISO 27001 Compliance Summary</h2>
    <div style="display:flex;align-items:center;gap:36px;margin-bottom:20px;">
      <div style="text-align:center;min-width:130px;">
        <p style="font-size:56px;font-weight:900;color:${compColor};line-height:1;">${compScore}%</p>
        <p style="color:#64748b;font-size:12px;margin-top:5px;">Compliance · ${snap.compliance?.coverage ?? 0}% assessed</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;">
        ${[
          ['Compliant',      snap.compliance?.compliant     ?? 0, '#10b981'],
          ['Partial',        snap.compliance?.partial       ?? 0, '#f59e0b'],
          ['Non-Compliant',  snap.compliance?.nonCompliant  ?? 0, '#ef4444'],
          ['Not Applicable', snap.compliance?.notApplicable ?? 0, '#94a3b8'],
        ].map(([label, count, color]) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:10px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <div>
              <p style="font-size:18px;font-weight:800;color:#0f172a;">${count}</p>
              <p style="font-size:10px;color:#64748b;">${label}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <!-- 6. Audit Findings -->
  ${sorted.length > 0 ? `
  <section>
    <h2>6. Audit Findings (${sorted.length})</h2>
    ${sorted.map((f, i) => `
      <div style="border:1px solid #e2e8f0;border-left:4px solid ${SEV_COLORS[f.severity] ?? '#94a3b8'};border-radius:10px;overflow:hidden;margin-bottom:16px;">
        <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:9px;flex-wrap:wrap;">
          <code style="font-size:11px;color:#64748b;">${f.finding_number ?? `F-${String(i + 1).padStart(3, '0')}`}</code>
          <span style="background:${SEV_COLORS[f.severity] ?? '#94a3b8'};color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;">${f.severity ?? '—'}</span>
          <span style="font-weight:600;color:#0f172a;flex:1;">${f.title ?? '—'}</span>
          <span style="font-size:11px;color:#64748b;text-transform:capitalize;">${(f.status ?? '').replace('_', ' ')}</span>
        </div>
        <div style="padding:14px 16px;">
          <p style="color:#374151;margin-bottom:10px;line-height:1.75;">${f.description ?? ''}</p>
          ${f.recommendation ? `
          <div style="background:#eff6ff;border-radius:6px;padding:12px;margin-top:8px;">
            <p style="color:#1d4ed8;font-weight:600;font-size:11px;margin-bottom:5px;">Recommendation</p>
            <p style="color:#374151;font-size:12px;line-height:1.7;">${f.recommendation}</p>
          </div>` : ''}
          ${(f.remediation_owner || f.remediation_deadline) ? `
          <p style="font-size:11px;color:#64748b;margin-top:8px;">
            ${f.remediation_owner ? `Owner: ${f.remediation_owner}` : ''}
            ${f.remediation_deadline ? ` · Deadline: ${formatDate(f.remediation_deadline)}` : ''}
          </p>` : ''}
        </div>
      </div>`).join('')}
  </section>` : ''}

  <!-- 7. Final Opinion -->
  ${opinion ? `
  <section>
    <h2>7. Final Opinion</h2>
    <div style="border:2px solid ${opinion.barColor};border-radius:10px;padding:22px;">
      <p style="font-size:20px;font-weight:800;color:${opinion.barColor};margin-bottom:12px;">${opinion.label}</p>
      <p style="color:#374151;line-height:1.85;">${report.opinion_notes ?? 'No additional notes provided.'}</p>
    </div>
  </section>` : ''}

  <!-- Footer -->
  <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;color:#94a3b8;font-size:11px;">
    <p>Generated by ISO Shield · ${new Date(report.generated_at).toLocaleString()}</p>
    <p style="margin-top:5px;">This report is confidential. Unauthorized distribution is prohibited.</p>
  </div>

</div>
</body>
</html>`
}

// ── main export ───────────────────────────────────────────────────────────────

export async function exportReportToPDF(report: AuditReport, findings: any[]): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const html = buildHTML(report, findings)

  // Mount hidden iframe — no fixed height, let content expand naturally
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;top:-99999px;left:-99999px;width:794px;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  const idoc = iframe.contentDocument ?? iframe.contentWindow?.document
  if (!idoc) {
    document.body.removeChild(iframe)
    throw new Error('iframe unavailable')
  }
  idoc.open()
  idoc.write(html)
  idoc.close()

  // Wait for full render + fonts
  await new Promise<void>(res => {
    const done = () => setTimeout(res, 600)
    if (idoc.readyState === 'complete') done()
    else iframe.onload = done
  })

  const body = idoc.body as HTMLElement

  const A4_W_MM = 210
  const A4_H_MM = 297
  const PAGE_W  = 794
  const PAGE_H  = 1123
  const SCALE   = 2
  const totalH  = body.scrollHeight
  const pages   = Math.ceil(totalH / PAGE_H)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  for (let p = 0; p < pages; p++) {
    const offsetY = p * PAGE_H
    const sliceH  = Math.min(PAGE_H, totalH - offsetY)

    // ── Clone + translate: the only reliable way to slice with html2canvas ──
    // Create a fixed-size viewport div, clone body inside it shifted up by offsetY.
    // html2canvas only sees the viewport, giving us exactly the right slice.
    const viewport = idoc.createElement('div')
    viewport.style.cssText = [
      'position:absolute',
      'top:0',
      'left:0',
      `width:${PAGE_W}px`,
      `height:${sliceH}px`,
      'overflow:hidden',
      'background:white',
    ].join(';')

    const clone = body.cloneNode(true) as HTMLElement
    clone.style.cssText = [
      'position:absolute',
      `top:-${offsetY}px`,
      'left:0',
      `width:${PAGE_W}px`,
      'margin:0',
      'padding:0',
    ].join(';')

    viewport.appendChild(clone)
    idoc.body.appendChild(viewport)

    const canvas = await html2canvas(viewport, {
      scale:           SCALE,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: p === 0 ? '#0f172a' : '#ffffff',
      width:           PAGE_W,
      height:          sliceH,
      windowWidth:     PAGE_W,
      windowHeight:    sliceH,
      logging:         false,
    })

    // Clean up viewport clone
    idoc.body.removeChild(viewport)

    const imgData = canvas.toDataURL('image/jpeg', 0.97)
    const imgH_mm = (sliceH / PAGE_H) * A4_H_MM

    if (p > 0) pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_W_MM, imgH_mm)
  }

  document.body.removeChild(iframe)

  const filename = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_v${report.version}_${
    new Date().toISOString().split('T')[0]
  }.pdf`
  pdf.save(filename)
}