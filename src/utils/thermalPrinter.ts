/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, Agency, PaymentRecord } from '../types';
import {
  triggerPrintCustomerThermalBill,
  printCustomerThermalBill,
  buildCustomerBillThermalSnippet,
  buildCustomerBillPlainText,
  triggerBluetoothCustomerThermalBill,
  triggerDirectPrintReceipt,
  buildReceiptThermalSnippet,
  buildReceiptPlainText,
  triggerBluetoothThermalPrint
} from '../services/printService';

export {
  triggerPrintCustomerThermalBill,
  printCustomerThermalBill,
  buildCustomerBillThermalSnippet,
  buildCustomerBillPlainText,
  triggerBluetoothCustomerThermalBill,
  triggerDirectPrintReceipt,
  buildReceiptThermalSnippet,
  buildReceiptPlainText,
  triggerBluetoothThermalPrint
};

/**
 * Convenience helper function to trigger a printable version of a customer's monthly bill
 * using the thermal printer CSS styles currently defined in index.css.
 * 
 * @param invoice The customer's monthly bill / invoice data
 * @param agency Agency configuration and settings
 */
export function printThermalBill(invoice: Invoice, agency: Agency): void {
  printCustomerThermalBill(invoice, agency);
}

export default printCustomerThermalBill;
