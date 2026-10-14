// src/app/App.tsx

import { Routes, Route } from "react-router-dom";
import { LoginPage } from "../src/features/auth/LoginPage";
import { ProtectedRoute } from "../src/features/auth/ProtectedRoute";

import { PlaceholderPage } from "../src/components/PlaceholderPage";
import { navigationConfig, flattenRoutes } from "./config/navigation";
import { AppLayout } from "./app/AppLayout";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ItemSearchListPage } from "./features/items/ItemSearchListPage";
import { ItemMasterFormPage } from "./features/items/ItemMasterFormPage";
import { PartyMasterFormPage } from "./features/parties/PartyMasterFormPage";
import { PartySearchListPage } from "./features/parties/PartySearchListPage";
import { UnitSearchListPage } from "./features/uom/uomSearchListPage";
import { UnitMasterFormPage } from "./features/uom/uomMasterFormPage";
import { BranchSearchListPage } from "./features/branch/branchSearchListPage";
import { BranchMasterFormPage } from "./features/branch/branchMasterFormPage";

import { TaxSearchListPage } from "./features/tax/TaxSearchListPage";
import { TaxMasterFormPage } from "./features/tax/TaxMasterFormPage";
import { CurrencyMasterFormPage } from "./features/currency/CurrencyMasterFormPage";
import { CurrencyListPage } from "./features/currency/CurrencyListPage";
import { EmployeeSearchListPage } from "./features/employee/EmployeeSearchListPage";
import { EmployeeMasterFormPage } from "./features/employee/EmployeeMasterFormPage";
import { HSNSearchListPage } from "./features/hsn/HSNSearchListPage";
import { HSNMasterFormPage } from "./features/hsn/HSNMasterFormPage";
//SALES

import { EnquiryListPage } from "./features/sales/enquiry/EnquiryListPage";
import { EnquiryFormPage } from "./features/sales/enquiry/EnquiryFormPage";
import { QuotationListPage } from "./features/sales/quotation/QuotationListPage";
import { QuotationFormPage } from "./features/sales/quotation/QuotationFormPage";
import { SaleOrderListPage } from "./features/sales/saleOrder/SaleOrderListPage";
import { SaleOrderFormPage } from "./features/sales/saleOrder/SaleOrderFormPage";
import { DeliveryChallanListPage } from "./features/sales/deliveryChallan/DeliveryChallanListPage";
import { DeliveryChallanFormPage } from "./features/sales/deliveryChallan/DeliveryChallanFormPage";
import { InvoiceListPage } from "./features/sales/invoice/InvoiceListPage";
import { InvoiceFormPage } from "./features/sales/invoice/InvoiceFormPage";
import { EInvoicePage } from "./features/sales/eInvoice/EInvoicePage";
import { EWayBillPage } from "./features/sales/ewayBill/EWayBillPage";
import { SalesReturnListPage } from "./features/sales/salesReturn/SalesReturnListPage";
import { SalesReturnFormPage } from "./features/sales/salesReturn/SalesReturnFormPage";
import { CreditNoteListPage } from "./features/sales/creditNote/CreditNoteListPage";
import { CreditNoteFormPage } from "./features/sales/creditNote/CreditNoteFormPage";

//import { BankSearchListPage } from "./features/bank/BankSearchListPage";
//import { BankFormPage } from "./features/bank/BankFormPage";
import { BankSearchListPage } from "./features/bank/BankSearchListPage";
import { BankMasterFormPage } from "./features/bank/BankMasterFormPage";

import { PurchaseRequisitionListPage } from "./features/purchaseRequisitions/PurchaseRequisitionListPage";
import { PurchaseRequisitionFormPage } from "./features/purchaseRequisitions/PurchaseRequisitionFormPage";
import { PurchaseRequisitionApprovalPage } from "./features/purchaseRequisitions/PurchaseRequisitionApprovalPage";
import { PurchaseOrderListPage } from "./features/purchaseOrders/PurchaseOrderListPage";
import { PurchaseOrderFormPage } from "./features/purchaseOrders/PurchaseOrderFormPage";
import { PurchaseOrderApprovalPage } from "./features/purchaseOrders/PurchaseOrderApprovalPage";
import { PurchaseInvoiceListPage } from "./features/purchaseInvoices/PurchaseInvoiceListPage";
import { PurchaseInvoiceFormPage } from "./features/purchaseInvoices/PurchaseInvoiceFormPage";
import { PurchaseReturnListPage } from "./features/purchaseReturns/PurchaseReturnListPage";
import { PurchaseReturnFormPage } from "./features/purchaseReturns/PurchaseReturnFormPage";
import { DebitNoteListPage } from "./features/debitNotes/DebitNoteListPage";
import { DebitNoteFormPage } from "./features/debitNotes/DebitNoteFormPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { DocNumberFormatListPage } from "./features/docNumberFormats/DocNumberFormatListPage";
import { DocNumberFormatFormPage } from "./features/docNumberFormats/DocNumberFormatFormPage";
import { StockTransferPage } from "./features/inventory/StockTransferPage";
import { MasterReportPage } from "./features/master-report";
const BUILT_PATHS = new Set([
  "/",
  "/parties",
  "/settings",
  "/bank",
  "/tax",
  "/employee",
  "/uom",
  "/branch",
  "/inventory/godown",
  "/purchase/order-approval",
  "/inventory/stock-transfer",
  "/enquiry",
  "/sales/quotation",
  "/sales/sale-order",
  "/sales/delivery-challan",
  "/sales/invoice",
  "/sales/e-invoice",
  "/sales/eway-bill",
  "/sales/return",
  "/sales/credit-note",
  "/master-reports",
]);

export function App() {
  const placeholderRoutes = flattenRoutes(navigationConfig).filter(
    (r) => !BUILT_PATHS.has(r.path),
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Dashboard — placeholder</div>} />
          <Route path="/parties" element={<PartySearchListPage />} />
          <Route path="/parties/new" element={<PartyMasterFormPage />} />
          <Route path="/parties/:partyCode" element={<PartyMasterFormPage />} />
          <Route
            path="/parties/:partyCode/view"
            element={<PartyMasterFormPage readOnly />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/document-number-formats" element={<DocNumberFormatListPage />} />
          <Route path="/settings/document-number-formats/new" element={<DocNumberFormatFormPage />} />
          <Route path="/settings/document-number-formats/:id" element={<DocNumberFormatFormPage />} />
          <Route path="/settings/document-number-formats/:id/view" element={<DocNumberFormatFormPage readOnly />} />
          <Route path="/items" element={<ItemSearchListPage />} />
          <Route path="/items/new" element={<ItemMasterFormPage />} />
          <Route path="/bank/" element={<BankSearchListPage />} />
          <Route path="/bank/new" element={<BankMasterFormPage />} />
          <Route path="/bank/:bankCode" element={<BankMasterFormPage />} />
          <Route path="/uom" element={<UnitSearchListPage />} />
          <Route path="/uom/new" element={<UnitMasterFormPage />} />
          <Route path="/uom/:unitCode" element={<UnitMasterFormPage />} />
          <Route path="/branch" element={<BranchSearchListPage />} />
          <Route path="/branch/new" element={<BranchMasterFormPage />} />
          <Route
            path="/branch/:branchCode"
            element={<BranchMasterFormPage />}
          />
          <Route path="/items/:itemCode" element={<ItemMasterFormPage />} />
          <Route path="/items/:itemCode/view" element={<ItemMasterFormPage readOnly />} />
          <Route
            path="/purchase/requisition"
            element={<PurchaseRequisitionListPage />}
          />
          <Route
            path="/purchase/requisition-approval"
            element={<PurchaseRequisitionApprovalPage />}
          />
          <Route
            path="/purchase/requisition/new"
            element={<PurchaseRequisitionFormPage />}
          />
          <Route
            path="/purchase/requisition/:prNo"
            element={<PurchaseRequisitionFormPage />}
          />
          <Route
            path="/purchase/requisition/:prNo/view"
            element={<PurchaseRequisitionFormPage readOnly />}
          />
          <Route path="/purchase/order" element={<PurchaseOrderListPage />} />
          <Route path="/purchase/order-approval" element={<PurchaseOrderApprovalPage />} />
          <Route
            path="/purchase/order/new"
            element={<PurchaseOrderFormPage />}
          />
          <Route
            path="/purchase/order/:poNo"
            element={<PurchaseOrderFormPage />}
          />
          <Route
            path="/purchase/order/:poNo/view"
            element={<PurchaseOrderFormPage readOnly />}
          />
          <Route
            path="/purchase/invoice"
            element={<PurchaseInvoiceListPage />}
          />
          <Route
            path="/purchase/invoice/new"
            element={<PurchaseInvoiceFormPage />}
          />
          <Route
            path="/purchase/invoice/:invoiceNo"
            element={<PurchaseInvoiceFormPage />}
          />
          <Route
            path="/purchase/invoice/:invoiceNo/view"
            element={<PurchaseInvoiceFormPage readOnly />}
          />
          <Route path="/purchase/return" element={<PurchaseReturnListPage />} />
          <Route
            path="/purchase/return/new"
            element={<PurchaseReturnFormPage />}
          />
          <Route
            path="/purchase/return/:returnNo"
            element={<PurchaseReturnFormPage />}
          />
          <Route
            path="/purchase/return/:returnNo/view"
            element={<PurchaseReturnFormPage readOnly />}
          />
          <Route path="/purchase/debit-note" element={<DebitNoteListPage />} />
          <Route
            path="/purchase/debit-note/new"
            element={<DebitNoteFormPage />}
          />
          <Route
            path="/purchase/debit-note/:debitNoteNo"
            element={<DebitNoteFormPage />}
          />
          <Route
            path="/purchase/debit-note/:debitNoteNo/view"
            element={<DebitNoteFormPage readOnly />}
          />
          <Route path="/inventory/godown" element={<InventoryPage />} />
          <Route path="/inventory/stock-transfer" element={<StockTransferPage />} />
          <Route path="/tax" element={<TaxSearchListPage />} />
          <Route path="/tax/new" element={<TaxMasterFormPage />} />
          <Route path="/tax/:id" element={<TaxMasterFormPage />} />
          <Route path="/currency" element={<CurrencyListPage />} />
          <Route path="/currency/new" element={<CurrencyMasterFormPage />} />
          <Route
            path="/currency/:currencyCode"
            element={<CurrencyMasterFormPage />}
          />
          <Route path="/employee" element={<EmployeeSearchListPage />} />
          <Route path="/employee/new" element={<EmployeeMasterFormPage />} />
          <Route path="/employee/:id" element={<EmployeeMasterFormPage />} />
          <Route path="/hsn" element={<HSNSearchListPage />} />
          <Route path="/hsn/new" element={<HSNMasterFormPage />} />
          {/* SALES */}
          <Route path="/enquiry" element={<EnquiryListPage />} />
          <Route path="/enquiry/new" element={<EnquiryFormPage key="new" />} />
          <Route path="/enquiry/:id" element={<EnquiryFormPage />} />
          <Route path="/enquiry/:id/view" element={<EnquiryFormPage readOnly />} />
          <Route path="/sales/quotation" element={<QuotationListPage />} />
          <Route path="/sales/quotation/new" element={<QuotationFormPage key="new" />} />
          <Route path="/sales/quotation/:id" element={<QuotationFormPage />} />
          <Route path="/sales/quotation/:id/view" element={<QuotationFormPage readOnly />} />
          <Route path="/sales/sale-order" element={<SaleOrderListPage />} />
          <Route path="/sales/sale-order/new" element={<SaleOrderFormPage key="new" />} />
          <Route path="/sales/sale-order/:id" element={<SaleOrderFormPage />} />
          <Route path="/sales/sale-order/:id/view" element={<SaleOrderFormPage readOnly />} />
          <Route path="/sales/delivery-challan" element={<DeliveryChallanListPage />} />
          <Route path="/sales/delivery-challan/new" element={<DeliveryChallanFormPage key="new" />} />
          <Route path="/sales/delivery-challan/:id" element={<DeliveryChallanFormPage />} />
          <Route path="/sales/delivery-challan/:id/view" element={<DeliveryChallanFormPage readOnly />} />
          <Route path="/sales/invoice" element={<InvoiceListPage />} />
          <Route path="/sales/invoice/new" element={<InvoiceFormPage key="new" />} />
          <Route path="/sales/invoice/:id" element={<InvoiceFormPage />} />
          <Route path="/sales/invoice/:id/view" element={<InvoiceFormPage readOnly />} />
          <Route path="/sales/return" element={<SalesReturnListPage />} />
          <Route path="/sales/return/new" element={<SalesReturnFormPage key="new" />} />
          <Route path="/sales/return/:id" element={<SalesReturnFormPage />} />
          <Route path="/sales/return/:id/view" element={<SalesReturnFormPage readOnly />} />
          <Route path="/sales/credit-note" element={<CreditNoteListPage />} />
          <Route path="/sales/credit-note/new" element={<CreditNoteFormPage key="new" />} />
          <Route path="/sales/credit-note/:id" element={<CreditNoteFormPage />} />
          <Route path="/sales/credit-note/:id/view" element={<CreditNoteFormPage readOnly />} />
          <Route path="/sales/e-invoice" element={<EInvoicePage />} />
          <Route path="/sales/eway-bill" element={<EWayBillPage />} />
          <Route path="/hsn/:hsnCode" element={<HSNMasterFormPage />} />
          {placeholderRoutes.map((r) => (
            <Route
              key={r.path}
              path={r.path}
              element={<PlaceholderPage title={r.label} />}
            />
          ))}
          <Route path="/master-reports" element={<MasterReportPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
