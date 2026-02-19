import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param sheetName Name of the Excel sheet
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(data[0]).map((key) => {
    const headerLength = key.length;
    const maxDataLength = Math.max(
      ...data.map((row) => {
        const value = row[key];
        return value ? String(value).length : 0;
      })
    );
    return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  // Excel sheet names cannot exceed 31 characters
  const validSheetName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, validSheetName);

  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export multiple sheets to Excel file
 * @param sheets Array of { name: string, data: any[] }
 * @param filename Name of the file (without extension)
 */
export function exportMultipleSheets(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
): void {
  if (!sheets || sheets.length === 0) {
    throw new Error('No sheets to export');
  }

  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    // Excel sheet names cannot exceed 31 characters
    const sheetName = sheet.name.length > 31 ? sheet.name.substring(0, 31) : sheet.name;
    
    if (sheet.data && sheet.data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data);

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(sheet.data[0]).map((key) => {
        const headerLength = key.length;
        const maxDataLength = Math.max(
          ...sheet.data.map((row) => {
            const value = row[key];
            return value ? String(value).length : 0;
          })
        );
        return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, maxWidth) };
      });
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    } else {
      // Add empty sheet with just the name (for sheets that failed to load or have no data)
      // Create a minimal worksheet with headers if we have any info about expected columns
      const emptyWorksheet = XLSX.utils.aoa_to_sheet([[]]);
      XLSX.utils.book_append_sheet(workbook, emptyWorksheet, sheetName);
    }
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
