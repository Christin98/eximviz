"use strict";

import '@babel/polyfill';
import powerbi from "powerbi-visuals-api";
// import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import {currencyFormatter, numberFormatter,stringFormatter,percentageFomratter} from './formatText'


import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IDownloadService = powerbi.extensibility.IDownloadService;


import { Grid, ColDef, GridOptions, ValueFormatterService, GridApi, ColumnApi } from 'ag-grid-community';
import 'ag-grid-enterprise'
import { VisualSettings } from './settings';
import { LicenseManager } from 'ag-grid-enterprise';

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
    getColumnState: true,
    blockLoadDebounceMillis: DEFAULT_DEBOUNCE_MS,
    statusBar: {
        statusPanels: [
          { statusPanel: "agTotalAndFilteredRowCountComponent", align: "left" },
          { statusPanel: "agTotalRowCountComponent", align: "center" },
          { statusPanel: "agFilteredRowCountComponent", align: "right" }
        ]
      },
    defaultColDef: {
        rowGroup:false,
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
        const settings = this.visualSettings = VisualSettings.parse<VisualSettings>(dataView);


           const columnDefs = dataView.table.columns.map((c, index) => {
            const columnDef = {
                headerName: c.displayName,
                field: c.displayName.replace(/\s/g, '').toLowerCase(),
                
            } as ColDef;

            if(c.isMeasure) {
                /* To check the value is in usd and format it */
                if(c.displayName.includes("usd") || c.displayName.includes("USD")){
                    columnDef.valueFormatter = currencyFormatter;
                }
                if(c.displayName.includes("percentage") || c.displayName.includes("PERCENTAGE")){
                    columnDef.valueFormatter = percentageFomratter;
                }
                else{
                    columnDef.valueFormatter = numberFormatter;
                }
                // aggereagtion of values
                columnDef.enableValue = true
                columnDef.cellDataType = 'number'
                columnDef.aggFunc = 'sum'
            } else {
                columnDef.valueFormatter = stringFormatter;
                columnDef.cellDataType = 'text'
                columnDef.enablePivot = false
                columnDef.enableRowGroup = true
                columnDef.enableValue = false
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
                checkboxColumn: rowIndex,
            };
            row.forEach((item, i) => {
                rowData[columnDefs[i].field] = item;
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

                let jsonString;
                let requestBody = {};

                // Get column Properties
                const columnApi: ColumnApi = this.gridOptions.columnApi;
                var columnProperties = []
                var rowGropuFlag = false;
                var columnState = columnApi.getColumnState();
                for (let i = 0 ; i < columnState.length; i++ ){
                    if(columnState[i]['rowGroup'] === true){
                        rowGropuFlag = true;
                        columnProperties.push({"columnName":  columnState[i]['colId'].toUpperCase(),
                                "rowIndex": columnState[i]['rowGroupIndex']}
                                )
                    }
                }
               
                if(rowGropuFlag === false){
                const paginationPageSize = this.gridOptions.paginationPageSize; 
                const currentPage = this.gridOptions.api.paginationGetCurrentPage();
                const startRow = currentPage * paginationPageSize;
                const endRow = Math.min(startRow + paginationPageSize, this.gridOptions.api.getDisplayedRowCount());
                const displayedData = []
                    for (let i = startRow; i < endRow; i++) {
                        const rowNode = this.gridOptions.api.getDisplayedRowAtIndex(i);
                        displayedData.push(rowNode.data);
                    }                     
            
                const jsonData1: string = JSON.stringify(displayedData);

                const jsonData2: any[] = JSON.parse(jsonData1);
                const extractedValues = jsonData2.map(item => ({
                    IMPORTER_NAME: item.importer_name || null,
                    SUPPLIER_NAME: item.supplier_name || null,
                    HS_CODE: item.hs_code || null ,
                    ORIGIN_COUNTRY: item.origin_country || null,
                    PORT_OF_SHIPMENT: item.port_of_shipment|| null,
                    FOREIGN_PORT :item.foreign_port|| null,
                    INDIAN_PORT: item.indian_port|| null,
                    TOTAL_ASSESS_USD: item.total_assess_usd|| null,
                    STD_QUANTITY: item.std_quantity|| null,
                    EXPORTER_NAME :item.exporter_name|| null,
                    BUYER_NAME : item.buyer_name|| null,
                    PERCENTAGE_OF_FOB_USD: item.fob_percentage|| null,
                    PERCENTAGE_OF_STD_QUANTITY:item.std_quantity_percentage|| null,
                    FOB_USD:item.fob_usd|| null,
                    IEC:item.iec|| null,
                    UNIT_PRICE_USD:item.unit_price_usd|| null,
                    TOTAL_ASSESS_USD_PERCENTAGE:item.total_assess_usd_percentage|| null
                }))

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
                jsonString = JSON.stringify(jsonData);  
                requestBody = {
                    name: jsonString,
                    columnProperties:columnProperties
                  };      
            }

            else if (rowGropuFlag === true) {
            var allRowData = [];
            this.gridOptions.api.forEachNode(function (node) {
                if(node.data != undefined){
                    allRowData.push(node.data);
                }
            });
            const jsonData1: string = JSON.stringify(allRowData);
            const jsonData2 :any = JSON.parse(jsonData1);
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
            const extractedValues = jsonData2.map(item => {
                const entry: Partial<ImportData> = {};
              
                if ('importer_name' in item) entry.IMPORTER_NAME = item.importer_name || null;
                if ('supplier_name' in item) entry.SUPPLIER_NAME = item.supplier_name || null;
                if ('hs_code' in item) entry.HS_CODE = item.hs_code || null;
                if ('origin_country' in item) entry.ORIGIN_COUNTRY = item.origin_country || null;
                if ('port_of_shipment' in item) entry.PORT_OF_SHIPMENT = item.port_of_shipment || null;
                if ('foreign_port' in item) entry.FOREIGN_PORT = item.foreign_port || null;
                if ('indian_port' in item) entry.INDIAN_PORT = item.indian_port || null;
                if ('total_assess_usd' in item) entry.TOTAL_ASSESS_USD = item.total_assess_usd || null;
                if ('std_quantity' in item) entry.STD_QUANTITY = item.std_quantity || null;
                if ('exporter_name' in item) entry.EXPORTER_NAME = item.exporter_name || null;
                if ('buyer_name' in item) entry.BUYER_NAME = item.buyer_name || null;
                if ('fob_percentage' in item) entry.PERCENTAGE_OF_FOB_USD = item.fob_percentage || null;
                if ('std_quantity_percentage' in item) entry.PERCENTAGE_OF_STD_QUANTITY = item.std_quantity_percentage || null;
                if ('fob_usd' in item) entry.FOB_USD = item.fob_usd || null;
                if ('iec' in item) entry.IEC = item.iec || null;
                if ('unit_price_usd' in item) entry.UNIT_PRICE_USD = item.unit_price_usd || null;
                if ('total_assess_usd_percentage' in item) entry.TOTAL_ASSESS_USD_PERCENTAGE = item.total_assess_usd_percentage || null;
              
                return entry as ImportData;
              });
              
              const jsonData: ImportData[] = [];
              extractedValues.forEach(entry => {
                if (Object.keys(entry).length > 0) {
                  jsonData.push(entry);
                }
              });         
              jsonString = JSON.stringify(jsonData);   
              requestBody = {
                name: jsonString,
                columnProperties:JSON.stringify(columnProperties)
              };               
            }
            else{
                console.log("Error")
            }
            const downloadlink = `https://powerbidownload.azurewebsites.net/api/downloadlink`;
            fetch(downloadlink,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                  },
                body: JSON.stringify(requestBody)
            }).then(response => response.text())
            .then(result => {
                 const url = `https://powerbidownload.azurewebsites.net${result}`
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