import * as XLSX from 'xlsx-js-style';

//判斷是否不要連動噴印資料
export function checkBypassPrintData(packingMaterial) {
    if (!packingMaterial) {
        return false;
    } else if (packingMaterial.includes('杜邦') || packingMaterial.includes('BARLOG')) {
        return true;
    }
    return false;
}

/**
 * 格式化顯示底部噴印欄位
 * @param {string} packingBottom 底部噴印的原始文字
 * @param {string} packingMaterial 包裝規格
 * @returns 
 */
export function formatPackingBottom(packingBottom, packingMaterial) {
    if (packingBottom && !checkBypassPrintData(packingMaterial)) {
        return packingBottom + '+LOT+流水號';
    } else {
        return packingBottom;
    }
}

/**
 * 格式化顯示杜邦品噴印欄位
 * @param {string} dupontPrint 杜邦品噴印的原始文字
 * @param {string} prdPc 成品簡碼
 * @returns 
 */
export function formatPackingDupontPrint(dupontPrint, prdPc) {
    if (dupontPrint && ('string' === typeof prdPc)) {
        return `${prdPc.slice(0, 5)} ${prdPc.slice(5)} ${dupontPrint}+流水號`;
    } else {
        return dupontPrint;
    }
}

//將資料轉成ws格式
export function setCellsToWorkSheet(data, ws, exportCols, columns) {
    let rowCount = 0;

    //垂直對齊
    const verticalAligns = [];
    columns.forEach(col => {
        const className = col.className;
        if (className) {
            if (className.indexOf('htMiddle') > -1) {
                verticalAligns.push('center');
            } else if (className.indexOf('htBottom') > -1) {
                verticalAligns.push('bottom');
            } else {                
                verticalAligns.push('top');
            }
        }
    });
    //處理每個row的資料
    data.forEach((lot, rowIndex) => {
        rowCount++;
        const cells = exportCols.map(col => col.value(lot));

        //將每個cell存到sheet中
        cells.forEach((col, colIndex) => {
            const cell = {
                t: exportCols[colIndex].type || 's',
                s: {
                    alignment: {
                        vertical: verticalAligns[colIndex] || 'top',
                        // wrapText: true,
                    },
                },
            };
            if (null === col) {
                col = '';
            } else {
                if ('n' === cell.t) {
                    //Number Formats
                    if (exportCols[colIndex].z) {
                        cell.z = exportCols[colIndex].z;
                    }
                    if (exportCols[colIndex].numFmt) {
                        cell.s.numFmt = exportCols[colIndex].numFmt;
                    }

                    if ('number' === typeof col) {
                        cell.v = col;
                    } else {
                        cell.v = Number(col);
                        if (isNaN(cell.v)) {
                            cell.t = 's';
                        }
                    }
                }

                if ('s' === cell.t) {
                    if ((null === col) || ('undefined' === typeof col)) {
                        cell.v = '';
                    } else {
                        let value = col.toString().trim().replace(/\n/g, '\r\n');
                        cell.v = value;
                    }
                }
            }
            const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
            ws[addr] = cell;
        });
        //指定列高
        //ws['!rows'].push({ hpt: 16.5 * maxLineCount });
    });

    return rowCount;
}

export function exportDataToXlsx(config, filename) {
    const wb = XLSX.utils.book_new();

    config.forEach(sheet => {
        //將handsontable的欄位定義轉成匯出用的格式
        const exportCols = sheet.columns.map((col, colIndex) => {
            const obj = {
                name: sheet.colHeaders[colIndex].replace(/<br \/>/g, '\n'),
                width: col.width ? col.width / 8.5 : 8,
                value: row => row[col.data],
            };
            if ('numeric' === col.type) {
                obj.type = 'n';
                if (col.numericFormat && col.numericFormat.pattern) {
                    if ('object' === typeof col.numericFormat.pattern) {
                        let numFmt = '0';
                        if (col.numericFormat.pattern.thousandSeparated) {
                            numFmt = '#,##0';
                        }
                        if (('number' === typeof col.numericFormat.pattern.mantissa) && (col.numericFormat.pattern.mantissa > 0)) {
                            if (col.numericFormat.pattern.trimMantissa) {
                                numFmt += '.' + '#'.padStart(col.numericFormat.pattern.mantissa, '#');
                            } else if (col.numericFormat.pattern.optionalMantissa) {
                                numFmt += '.' + '#'.padStart(col.numericFormat.pattern.mantissa, '0');
                            }
                        }
                        obj.numFmt = numFmt;
                    } else if ('string' === typeof col.numericFormat.pattern) {
                        obj.numFmt = col.numericFormat.pattern;
                    }
                }
            }
            return obj;
        });

        //取得hotInstance
        let hotInstance = null;
        if (sheet.hotTableComponent && sheet.hotTableComponent.current) {
            hotInstance = sheet.hotTableComponent.current.hotInstance;
        }

        //欄位名稱
        const colNames = exportCols.map((col, colIndex) => {
            const cell = {
                t: 's',
                v: col.name.replace(/<br \/>/g, '\n'),
                s: { alignment: { vertical: 'top', wrapText: true, } },
            };

            if (sheet.columns[colIndex] && sheet.columns[colIndex].className) {
                const className = sheet.columns[colIndex].className;
                if (className.indexOf('htMiddle') > -1) {
                    cell.s.alignment.vertical = 'center';
                } else if (className.indexOf('htBottom') > -1) {
                    cell.s.alignment.vertical = 'bottom';
                }
            }
            return cell;
        });

        const ws = XLSX.utils.aoa_to_sheet([colNames]);
        //欄位寬度
        ws['!cols'] = exportCols.map(col => ({ wch: col.width }));

        //合併儲存格
        if (sheet.mergeCells) {
            const hotMergeCells = [];
            if (Array.isArray(sheet.mergeCells)) {
                hotMergeCells.push(...sheet.mergeCells);
            } else if (sheet.mergeCells && hotInstance) {
                if (Array.isArray(hotInstance.getSettings().mergeCells)) {
                    hotMergeCells.push(...hotInstance.getSettings().mergeCells);
                }
            }
            if (hotMergeCells && hotMergeCells.length) {
                // hotMergeCells = [ { row: 0, col: 0, rowspan: 10, colspan: 1 } ];
                //row多+1是因為標題
                ws['!merges'] = hotMergeCells.map(cell => ({ s: { r: cell.row + 1, c: cell.col }, e: { r: cell.row + cell.rowspan, c: cell.col + cell.colspan - 1 } }));
                // ws['!merges'] = [ { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } } ];
            }
        }

        const rowCount = setCellsToWorkSheet(sheet.data, ws, exportCols, sheet.columns);
        //重新設定sheet範圍
        const lastAddr = XLSX.utils.encode_cell({ c: Math.max(colNames.length - 1, 0), r: Math.max(rowCount, 1) });
        ws['!ref'] = `A1:${lastAddr}`;

        //console.log(data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);

    });
    XLSX.writeFile(wb, filename);
}

//判斷包裝狀態是否屬於已結束，將不可進行 新增包裝項次、包裝結束等操作
export function isPackingStatusFinish(packingStatus) {
    if ('已完成' === packingStatus || '包裝取消' === packingStatus || '強制結束' === packingStatus) {
        return true;
    }

    return false;
}
