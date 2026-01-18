
/**
 * Servicio de generación de PDF para Presupuestos.
 * Expone window.generateBudgetPDF(data)
 * Dependencias: jsPDF, jspdf-autotable
 */

window.generateBudgetPDF = async function (data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Configuración estética
    const margin = 15;
    let y = margin;

    // --- Header ---

    // Logo
    if (data.company?.logoData) {
        try {
            // Asumiendo logo cuadrado/rectangular, ajustamos tamaño
            const logoW = 40;
            const logoH = 20; // Aproximado, idealmente leer ratio
            doc.addImage(data.company.logoData, 'PNG', margin, y, logoW, logoH, undefined, 'FAST');
            // No incrementamos Y aun, escribimos info a la derecha
        } catch (e) {
            console.warn("Error adding logo", e);
        }
    }

    // Info Empresa (Derecha)
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const brand = data.company?.brandName || "TALLER MECÁNICO";
    doc.text(brand, width - margin, y + 8, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const companyInfo = [
        data.company?.companyName,
        data.company?.address,
        data.company?.phone,
        data.company?.email,
        data.company?.cuit ? `CUIT: ${data.company.cuit}` : null
    ].filter(Boolean);

    let yInfo = y + 14;
    companyInfo.forEach(line => {
        doc.text(line, width - margin, yInfo, { align: "right" });
        yInfo += 5;
    });

    // Ajustar Y para lo siguiente
    y = Math.max(y + 25, yInfo + 10);

    // Título y Datos principales
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, width - margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`PRESUPUESTO`, margin, y);

    doc.setFontSize(12);
    doc.text(`${data.numero || "BORRADOR"}`, width - margin, y, { align: "right" });
    y += 6;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${data.fecha}`, width - margin, y, { align: "right" });
    if (data.sucursalNombre) {
        y += 5;
        doc.text(`Sucursal: ${data.sucursalNombre}`, width - margin, y, { align: "right" });
    }
    y += 10;

    // --- Datos Cliente ---
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, width - (margin * 2), 35, 2, 2, 'F');

    const cy = y + 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", margin + 5, cy + 5);

    doc.setFont("helvetica", "normal");
    const col1 = margin + 5;
    const col2 = width / 2;

    let row1 = cy + 12;
    doc.text(`Cliente: ${data.cliente?.nombre || "-"}`, col1, row1);
    doc.text(`Teléfono: ${data.cliente?.telefono || "-"}`, col2, row1);

    let row2 = row1 + 6;
    doc.text(`Vehículo: ${data.cliente?.vehiculo || "-"}`, col1, row2);
    doc.text(`Patente: ${data.cliente?.patente || "-"}`, col2, row2);

    let row3 = row2 + 6;
    doc.text(`Modelo: ${data.cliente?.modelo || "-"}`, col1, row3);
    doc.text(`Compañía: ${data.cliente?.compania || "-"}`, col2, row3);

    // Nro Siniestro/Chasis si existe
    if (data.cliente?.chasis || data.siniestro) {
        let row4 = row3 + 6;
        if (data.cliente?.chasis) doc.text(`Chasis: ${data.cliente.chasis}`, col1, row4);
        if (data.siniestro) doc.text(`Siniestro: ${data.siniestro}`, col2, row4);
    }

    y += 45;

    // --- Tabla Ítems ---
    const columns = [
        { header: "Cant", dataKey: "cantidad" },
        { header: "Descripción", dataKey: "descripcion" },
        { header: "P. Unit", dataKey: "unitStr" },
        { header: "Total", dataKey: "totalStr" },
    ];

    const rows = data.items.map(it => ({
        cantidad: it.cantidad,
        descripcion: it.descripcion,
        unitStr: `$ ${parseFloat(it.unit || 0).toFixed(2)}`,
        totalStr: `$ ${parseFloat(it.total || 0).toFixed(2)}`
    }));

    doc.autoTable({
        startY: y,
        head: [columns.map(c => c.header)],
        body: rows.map(r => Object.values(r)),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;

    // --- Totales ---
    const xTotals = width - margin - 60;

    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", xTotals, y);
    doc.text(`$ ${parseFloat(data.subtotal || 0).toFixed(2)}`, width - margin, y, { align: "right" });
    y += 6;

    if (data.taxRate > 0) {
        doc.text(`IVA (${data.taxRate}%):`, xTotals, y);
        doc.text(`$ ${parseFloat(data.taxAmount || 0).toFixed(2)}`, width - margin, y, { align: "right" });
        y += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL:", xTotals, y);
    doc.text(`$ ${parseFloat(data.total || 0).toFixed(2)}`, width - margin, y, { align: "right" });

    // --- Firma ---
    if (data.firmaDataUrl) {
        y += 15;
        // Verificar espacio disponible
        if (y + 40 > height - margin) {
            doc.addPage();
            y = margin;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Firma del Cliente / Conformidad:", margin, y);
        y += 5;

        try {
            doc.addImage(data.firmaDataUrl, 'PNG', margin, y, 60, 30);
            y += 35;
        } catch (e) { console.warn("Error adding signature", e); }
    }

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, width / 2, height - 10, { align: 'center' });
    }

    return doc;
};

// Helper: Asegurar carga de jsPDF
window.ensurePdfLoaded = async function () {
    if (window.jspdf) return;
    return new Promise((resolve, reject) => {
        // Fallback si no estuvieran los scripts en index.html, pero asumimos que están.
        // Aquí solo esperamos un momento por si acaso.
        let checks = 0;
        const interval = setInterval(() => {
            if (window.jspdf) { clearInterval(interval); resolve(); }
            if (checks++ > 50) { clearInterval(interval); reject("jsPDF not loaded"); }
        }, 100);
    });
};

// Helper: Convertir URL de imagen a DataURL (para logo local)
window.imageUrlToDataUrl = async function (url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
};
