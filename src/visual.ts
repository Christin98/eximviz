"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import { Parser } from 'json2csv';
import * as htmlToImage from 'html-to-image';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;




import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IDownloadService = powerbi.extensibility.IDownloadService;


import { Grid, ColDef, GridOptions, ValueFormatterService } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { ExcelExportModule } from 'ag-grid-enterprise';
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';
import { Console } from 'console';


var checkboxSelection = function (params) {
    // we put checkbox on the name if we are not doing grouping
    return params.columnApi.getRowGroupColumns().length === 0;
  };
  var headerCheckboxSelection = function (params) {
    // we put checkbox on the name if we are not doing grouping
    return params.columnApi.getRowGroupColumns().length === 0;
  };

const DEFAULT_DEBOUNCE_MS = 500;

const sideBar = {
    toolPanels: [
        {
            id: 'columns',
            labelDefault: 'Columns',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
        },
        {
            id: 'filters',
            labelDefault: 'Filters',
            labelKey: 'filters',
            iconKey: 'filter',
            toolPanel: 'agFiltersToolPanel',
        }
    ],
    
};

const defaultGridConfig = {
    sideBar,
    autoSizePadding: 0,
    enableRangeSelection: true,
    rowGroupPanelShow: 'onlyWhenGrouping',
    pivotMode: false,
    enableValue: true,
    floatingFiltersHeight: 20,
    enableAdvancedFilter: false,
    maxBlocksInCache: 2,
    pagination: true,
    paginationPageSize: 100,
    paginateChildRows: true,
    rowBuffer: 0,
    animateRows: true,
    suppressRowDeselection: false,
    rowSelection: 'multiple',
    enableCellTextSelection: false,
    suppressHorizontalScroll: false,
    enableCharts: true,
    suppressRowClickSelection: true,
    suppressAggFuncInHeader: true,
    suppressExcelExport: true,
    blockLoadDebounceMillis: DEFAULT_DEBOUNCE_MS,
    statusBar: {
        statusPanels: [
          { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
          { statusPanel: "agTotalRowCountComponent", align: "center" },
          { statusPanel: "agFilteredRowCountComponent", align: "right" }
        ]
      },
    defaultColDef: {
        editable:false,
        enableRowGroup: true,
        enablePivot: false,
        enableValue: true,
        resizable: true,
        sortable: true,
        floatingFilter: true,
        suppressFiltersToolPanel: false,
        menuTabs: ['filterMenuTab','columnsMenuTab','generalMenuTab'],
        minWidth: 80,
        filter: true,
        suppressFilter: false,
        debounceMs: DEFAULT_DEBOUNCE_MS,
        filterParams: {
            suppressAndOrCondition: true,
        },
    } as ColDef,
    processCellForClipboard: value => {
        const valueFormatter = value.column['colDef'].valueFormatter;
        return valueFormatter ? valueFormatter(value) : value.value;
    },
    onFirstDataRendered: ({api}) => api.expandAll(),
    onGridReady: ({api}) => api.sizeColumnsToFit(),
} as GridOptions;


export class Visual implements IVisual {
    private host: IVisualHost;
    private visualSettings: VisualSettings;
    private element: HTMLElement;
    private gridOptions: GridOptions;
    private button: HTMLButtonElement;
    private downloadservice : IDownloadService

    constructor(options: VisualConstructorOptions) {
    this.element = options.element;
    this.element.style.display = "flex"
    this.element.style.flexDirection = "column"
    this.downloadservice = options.host.downloadService
    this.element.classList.add('ag-theme-balham');
    this.button = document.createElement('button')
    this.button.innerHTML = 'Download Excel'
    this.element.appendChild(this.button);
    this.host = options.host;
}

    public update(options: VisualUpdateOptions) {
        let dataView = options.dataViews[0];
        console.log(dataView)
        const settings = this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);

        const currencyFormatter = (params) => {  return '$' + formatNumber(params.value);}

        const formatNumber = (number) => { 
            console.log(number) // this puts commas into the number eg 1000 goes to 1,000,  // i pulled this from stack overflow, i have no idea how it works  
            return Math.floor(number).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        }

           const columnDefs = dataView.table.columns.map((c, index) => {
            const columnDef = {
                headerName: c.displayName,
                field: c.displayName.replace(/\s/g, '').toLowerCase(),
            } as ColDef;

            if(c.isMeasure) {
                console.log("True");
                if(c.displayName)
                columnDef.valueFormatter = currencyFormatter;
            } else {
                console.log("False");
                columnDef.enablePivot = false
                columnDef.enableRowGroup = true
            }

            if (index === 0) {
                columnDef.headerCheckboxSelection = true;
                columnDef.checkboxSelection = true;
            }

            return columnDef;
        });

        LicenseManager.setLicenseKey(this.visualSettings.grid.gridKey)

        const rowData = dataView.table.rows.map((row, rowIndex) => {
            const rowData = {
                // Add a unique identifier for the checkbox column
                checkboxColumn: rowIndex, // Use a unique identifier, e.g., row index
            };
            row.forEach((item, i) => {
                rowData[columnDefs[i].field] = item;
            //     if(columnDefs[i].headerName === "TOTAL_ASSESS_USD"){
            //         rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2);
            //         if(item == ""){
            //             rowData[columnDefs[i].field] = "0";
            //         }
            //     }
            //     if(columnDefs[i].headerName === "FOB_USD"){
            //        console.log(rowData[columnDefs[i].field])
            //         // rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2)
            //         rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2)
            //     }
            //         if(columnDefs[i].headerName == "TOTAL_ASSESS_USD_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(2)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "FOB_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(3)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "STD_QUANTITY_PERCENTAGE"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(3)+"%"
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "STD_QUANTITY"){
            //             rowData[columnDefs[i].field] = rowData[columnDefs[i].field].toFixed(2);
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }
            //         if(columnDefs[i].headerName == "UNIT_PRICE_USD"){
            //             rowData[columnDefs[i].field] = "$"+rowData[columnDefs[i].field].toFixed(2);
            //             if(item == ""){
            //                 rowData[columnDefs[i].field] = "0";
            //             }
            //         }

            //     if(item == ""){
            //         rowData[columnDefs[i].field] = "NULL";
            //     }
            });
            return rowData;
        });

        if(!this.gridOptions) {
            this.gridOptions = {
                ...defaultGridConfig,
                floatingFilter: true,
                columnDefs: columnDefs,
                rowData: rowData,
            } as GridOptions;

            new Grid(this.element, this.gridOptions);
            this.button.onclick = () => {
                let contentXlsx: string ;
                const paginationPageSize = this.gridOptions.paginationPageSize; // Replace with your actual pagination settings
                const currentPage = this.gridOptions.api.paginationGetCurrentPage(); // Get the current active page
                const startRow = currentPage * paginationPageSize;
                const endRow = Math.min(startRow + paginationPageSize, this.gridOptions.api.getDisplayedRowCount());

                console.log(paginationPageSize, currentPage, startRow, endRow)

                const displayedData = [];
                for (let i = startRow; i < endRow; i++) {
                    const rowNode = this.gridOptions.api.getDisplayedRowAtIndex(i);
                    displayedData.push(rowNode.data);
                }
                
                const jsonData1: string = JSON.stringify(displayedData);

                const jsonData2: any[] = JSON.parse(jsonData1);
                console.log("json data", jsonData2)

                const extractedValues = jsonData2.map(item => ({
                    IMPORTER_NAME: item.importer_name,
                    SUPPLIER_NAME: item.supplier_name,
                    HS_CODE: item.hs_code,
                    ORIGIN_COUNTRY: item.origin_country,
                    PORT_OF_SHIPMENT: item.port_of_shipment,
                    FOREIGN_PORT :item.foreign_port,
                    INDIAN_PORT: item.indian_port,
                    TOTAL_ASSESS_USD: item.total_assess_usd,
                    STD_QUANTITY: item.std_quantity,
                    EXPORTER_NAME :item.exporter_name,
                    BUYER_NAME : item.buyer_name,
                    PERCENTAGE_OF_FOB_USD: item.fob_percentage,
                    PERCENTAGE_OF_STD_QUANTITY:item.std_quantity_percentage,
                    FOB_USD:item.fob_usd,
                    IEC:item.iec,
                    UNIT_PRICE_USD:item.unit_price_usd,
                    TOTAL_ASSESS_USD_PERCENTAGE:item.total_assess_usd_percentage
                }));

                interface ImportData {
                    "IMPORTER_NAME" : string,
                    "SUPPLIER_NAME" : string,
                    "HS_CODE"       : string,
                    "ORIGIN_COUNTRY" :string,
                    "PORT_OF_SHIPMENT":string,
                    "INDIAN_PORT": string,
                    "TOTAL_ASSESS_USD": number,
                    "STD_QUANTITY": number,
                    "EXPORTER_NAME": string,
                    "BUYER_NAME":string,
                    "PERCENTAGE_OF_FOB_USD":number,
                    "PERCENTAGE_OF_STD_QUANTITY": number,
                    "FOB_USD":number,
                    "FOREIGN_PORT":string,
                    "UNIT_PRICE_USD":number,
                    "IEC":number,
                    "TOTAL_ASSESS_USD_PERCENTAGE":number
                }
                const jsonData: ImportData[] = [];

                for(let i = 0; i< extractedValues.length ;i++ ){
                const entry: ImportData = 
                    {
                        HS_CODE: extractedValues[i]?.HS_CODE,
                        IMPORTER_NAME: extractedValues[i]?.IMPORTER_NAME ,
                        INDIAN_PORT: extractedValues[i]?.INDIAN_PORT ,
                        FOREIGN_PORT:extractedValues[i]?.FOREIGN_PORT,
                        ORIGIN_COUNTRY: extractedValues[i]?.ORIGIN_COUNTRY ,
                        PORT_OF_SHIPMENT: extractedValues[i]?.PORT_OF_SHIPMENT ,
                        STD_QUANTITY: extractedValues[i]?.STD_QUANTITY ,
                        SUPPLIER_NAME: extractedValues[i]?.SUPPLIER_NAME ,
                        TOTAL_ASSESS_USD: extractedValues[i]?.TOTAL_ASSESS_USD,
                        EXPORTER_NAME:extractedValues[i]?.EXPORTER_NAME,
                        BUYER_NAME:extractedValues[i]?.BUYER_NAME,
                        PERCENTAGE_OF_FOB_USD:extractedValues[i]?.PERCENTAGE_OF_FOB_USD,
                        FOB_USD:extractedValues[i]?.FOB_USD,
                        PERCENTAGE_OF_STD_QUANTITY:extractedValues[i]?.PERCENTAGE_OF_STD_QUANTITY,
                        IEC:extractedValues[i]?.IEC,
                        UNIT_PRICE_USD:extractedValues[i]?.UNIT_PRICE_USD,
                        TOTAL_ASSESS_USD_PERCENTAGE:extractedValues[i]?.TOTAL_ASSESS_USD_PERCENTAGE
                    }
                
                jsonData.push(entry)
            }

            const jsonString = JSON.stringify(jsonData);
            const requestBody = {
                name: jsonString
              };

            console.log(JSON.stringify(requestBody))
            const downloadlink = `https://funcprem-eximpedia-powerbidownload-ci-prod.azurewebsites.net/api/downloadlink`;

            fetch(downloadlink,{
                method: 'POST',
                // mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                  },
                body: JSON.stringify(requestBody)
            }).then(response => response.text())
            .then(result => {
                 const url = `https://funcprem-eximpedia-powerbidownload-ci-prod.azurewebsites.net${result}`
                 console.log(url)
                 this.host.launchUrl(url)})
            .catch(error => console.log('error', error));
            }
        } else {
            let api = this.gridOptions.api;
            api.setColumnDefs(columnDefs);
            api.setRowData(rowData);
            api.sizeColumnsToFit();
        }
    }

}