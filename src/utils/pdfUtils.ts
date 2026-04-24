import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDFReport = (data, columns, title) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  // Add table
  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: data,
  });

  // Save the PDF
  doc.save(`${title}.pdf`);
};