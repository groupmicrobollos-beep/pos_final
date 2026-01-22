
/**
 * Servicio de generación de PDF para Presupuestos.
 * Diseño "Boxed" (Contenedores)
 */

window.generateBudgetPDF = async function (data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Configs de color
    const borderColor = [40, 40, 40]; // Gris oscuro
    const headerBg = [255, 255, 255];
    const sectionTitleBg = [240, 240, 240];

    // Helper: Rounded Rect with Text
    function drawSectionHeader(text, x, y, w, h, fontSize = 10) {
        doc.setFillColor(...sectionTitleBg);
        doc.setDrawColor(...borderColor);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(text, x + 5, y + (h / 2) + 1.5); // vert center approx
    }

    function drawBox(x, y, w, h) {
        doc.setDrawColor(...borderColor);
        doc.roundedRect(x, y, w, h, 2, 2, 'S');
    }

    let y = margin;

    // --- 1. HEADER PRINCIPAL (Caja Grande) ---
    const headerH = 35;
    drawBox(margin, y, width - (margin * 2), headerH);

    // Logo (Simulado o Real)
    if (data.company?.logoData) {
        try {
            const logoW = 30; // Max width
            const logoMaxH = 25;
            const props = doc.getImageProperties(data.company.logoData);
            let h = (props.height * logoW) / props.width;
            let w = logoW;
            if (h > logoMaxH) {
                h = logoMaxH;
                w = (props.width * h) / props.height;
            }
            doc.addImage(data.company.logoData, 'PNG', margin + 5, y + 5, w, h);
        } catch (e) { }
    }

    // Texto Empresa (Centro/Izquierda del header)
    const textX = data.company?.logoData ? margin + 40 : margin + 5;

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const brandName = (data.company?.brandName || "TALLER MECÁNICO").toUpperCase();
    doc.text(brandName, textX, y + 12);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Construir bloque de dirección/contacto con mejor fallback
    const address = data.company?.address || "";
    // Asegurar que no sea undefined
    const emailInfo = data.company?.email || "";
    const phoneInfo = data.company?.phone || "";
    const cuitInfo = data.company?.cuit || data.sucursalCuit || "20-21581927-3"; // Hardcoded fallback requested by user
    const contact = [phoneInfo, emailInfo].filter(Boolean).join(" | ");

    doc.text(address, textX, y + 18);
    doc.text(contact, textX, y + 23);
    doc.setFont("helvetica", "bold");
    doc.text(`CUIT: ${cuitInfo}`, textX, y + 28);
    doc.setFont("helvetica", "normal");

    // Título Documento (Derecha del header)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PRESUPUESTO", width - margin - 5, y + 12, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("DOCUMENTO NO VÁLIDO COMO FACTURA", width - margin - 5, y + 20, { align: "right" });

    y += headerH + 5;

    // --- 2. DATOS DEL COMPROBANTE (Fila de 4 cajas) ---
    const boxW = (width - (margin * 2) - 9) / 4; // 3 gaps of 3mm
    const boxH = 15;

    const boxes = [
        { title: "NÚMERO", val: data.numero || "-" },
        { title: "FECHA", val: data.fecha || "-" },
        { title: "VÁLIDO HASTA", val: calculateValidDate(data.fecha) }, // Calcular 30 dias
        { title: "SUCURSAL", val: data.sucursalNombre || "-" }
    ];

    let cx = margin;
    doc.setTextColor(0);
    boxes.forEach(b => {
        drawBox(cx, y, boxW, boxH);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(b.title, cx + 2, y + 5);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(b.val, cx + 2, y + 11);

        cx += boxW + 3;
    });

    y += boxH + 5;

    // --- 3. DATOS DEL CLIENTE (Caja Ancha) ---
    const clientHeaderH = 8;
    drawSectionHeader("DATOS DEL CLIENTE", margin, y, width - (margin * 2), clientHeaderH);
    y += clientHeaderH;

    const clientBoxH = 25;
    drawBox(margin, y, width - (margin * 2), clientBoxH); // Solo borde inferior/lados realmente
    // Rectificar borde superior (ya dibujado por header) - visualmente OK

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const cLabels = [
        { l: "NOMBRE:", v: (data.cliente?.nombre || "-").toUpperCase(), x: 5, y: 8 },
        { l: "VEHÍCULO:", v: (data.cliente?.vehiculo || "-").toUpperCase(), x: 5, y: 16 },
        { l: "MODELO:", v: (data.cliente?.modelo || "-").toUpperCase(), x: 5, y: 24 }, // Nueva linea para modelo, avoid squeeze

        { l: "TELÉFONO:", v: data.cliente?.telefono || "-", x: 100, y: 8 },
        { l: "PATENTE:", v: (data.cliente?.patente || "-").toUpperCase(), x: 100, y: 16 },
        { l: "COMPAÑÍA:", v: (data.cliente?.compania || "-").toUpperCase(), x: 100, y: 24 }, // Nueva linea
    ];

    // Chasis si hay
    if (data.cliente?.chasis) {
        cLabels.push({ l: "CHASIS:", v: data.cliente.chasis, x: 100, y: 24 }); // Puede solapar Compania, adjust if needed
        // Fix: Mover compañia a izq o nueva linea?
        // Layout simple:
        // Col1: Nombre, Vehiculo, Modelo
        // Col2: Tel, Patente, Compania (Chasis?)
    }

    cLabels.forEach(f => {
        doc.setFont("helvetica", "bold");
        doc.text(f.l, margin + f.x, y + f.y);
        doc.setFont("helvetica", "normal");
        const offset = doc.getTextWidth(f.l) + 2;
        doc.text(f.v, margin + f.x + offset, y + f.y);
    });

    y += clientBoxH + 5;

    // --- 4. DETALLE (Tabla) ---
    drawSectionHeader("DETALLE DE SERVICIOS — TRABAJOS Y REPARACIONES", margin, y, width - (margin * 2), clientHeaderH);
    y += clientHeaderH + 2;

    const columns = [
        { header: "CANT.", dataKey: "cantidad" },
        { header: "DESCRIPCIÓN", dataKey: "descripcion" },
        { header: "PRECIO UNIT.", dataKey: "unitStr" },
        { header: "TOTAL", dataKey: "totalStr" },
    ];

    const tableRows = data.items.map(it => ({
        cantidad: it.cantidad,
        descripcion: it.descripcion,
        unitStr: `$ ${parseFloat(it.unit || 0).toFixed(2)}`,
        totalStr: `$ ${parseFloat(it.total || 0).toFixed(2)}`
    }));

    doc.autoTable({
        startY: y,
        head: [columns.map(c => c.header)],
        body: tableRows.map(r => Object.values(r)),
        theme: 'plain', // Clean look
        styles: { fontSize: 9, cellPadding: 3, lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0, borderBottomWidth: 0.5 },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: margin, right: margin },
        didDrawPage: function (data) {
            // Si se rompe pagina, dibujar borde? Omitir por simpleza
        }
    });

    y = doc.lastAutoTable.finalY + 5;

    // --- 5. FOOTER (Firma y Totales) ---
    // Asegurar espacio
    if (y + 40 > height - margin) {
        doc.addPage();
        y = margin;
    }

    const footerH = 40;
    // Caja Firma (Izq)
    const signW = 110;
    drawBox(margin, y, signW, footerH);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Firma Digital / Conformidad Cliente", margin + 2, y + 5);

    if (data.firmaDataUrl) {
        try {
            doc.addImage(data.firmaDataUrl, 'PNG', margin + 10, y + 8, 50, 25);
        } catch (e) { }
    }

    // Caja Totales (Der)
    const totalsW = width - (margin * 2) - signW - 5; // 5mm gap
    const totalsX = margin + signW + 5;
    drawBox(totalsX, y, totalsW, footerH);

    // Totales Internos
    let ty = y + 8;
    const rightAlign = totalsX + totalsW - 5;

    doc.setFontSize(9);
    doc.setTextColor(0);

    // Subtotal
    doc.text("Subtotal:", totalsX + 5, ty);
    doc.text(`$ ${parseFloat(data.subtotal || 0).toFixed(2)}`, rightAlign, ty, { align: "right" });
    ty += 6;

    // IVA
    if (data.taxAmount > 0) {
        doc.text(`IVA (${data.taxRate}%):`, totalsX + 5, ty);
        doc.text(`$ ${parseFloat(data.taxAmount || 0).toFixed(2)}`, rightAlign, ty, { align: "right" });
        ty += 6;
    }

    // Separator
    doc.setDrawColor(200);
    doc.line(totalsX + 2, ty, rightAlign + 2, ty);
    ty += 6;

    // TOTAL
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0); // RED
    doc.text("TOTAL", totalsX + 5, ty + 2);
    doc.text(`$ ${parseFloat(data.total || 0).toFixed(2)}`, rightAlign, ty + 2, { align: "right" });


    // --- 6. INFO FINAL ---
    y += footerH + 5;
    const condH = 20;
    drawBox(margin, y, width - (margin * 2), condH);

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("CONDICIONES GENERALES", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("• PRESUPUESTO VÁLIDO POR 30 DÍAS", margin + 3, y + 10);
    doc.text("• MANO DE OBRA GARANTIZADA", margin + 3, y + 14);

    return doc;
};

function calculateValidDate(dateStr) {
    try {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString("es-AR"); // Adjust locale if needed
    } catch { return "-"; }
}

// Helpers Legacy
window.ensurePdfLoaded = async function () {
    if (window.jspdf) return;
    return new Promise((resolve, reject) => {
        let checks = 0;
        const interval = setInterval(() => {
            if (window.jspdf) { clearInterval(interval); resolve(); }
            if (checks++ > 50) { clearInterval(interval); reject("jsPDF not loaded"); }
        }, 100);
    });
};

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
