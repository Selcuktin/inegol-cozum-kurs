// Unified Edesis Service Facade (SSOT)
import AccountingService from "./edesisAccountingService.js";
import StudentService from "./edesisStudentService.js";

export { AccountingService, StudentService };
export default {
  ...AccountingService,
  ...StudentService,
};
