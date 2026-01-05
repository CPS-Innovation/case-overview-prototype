/**
 * Calculate the report status based on DGA failure reasons' outcomes
 * @param {Object} caseItem - Case object with dga.failureReasons array
 * @returns {string|null} - 'Completed', 'In progress', or null (meaning "Not started")
 */
function getDgaReportStatus(caseItem) {
  // If no DGA or no failure reasons, status is "Not started" (null)
  if (!caseItem?.dga?.failureReasons || caseItem.dga.failureReasons.length === 0) {
    return null;
  }

  const failureReasons = caseItem.dga.failureReasons;
  const totalReasons = failureReasons.length;
  const completedReasons = failureReasons.filter(fr => fr.outcome !== null).length;

  // All failure reasons have outcomes = Completed
  if (completedReasons === totalReasons && totalReasons > 0) {
    return 'Completed';
  }

  // Some (but not all) failure reasons have outcomes = In progress
  if (completedReasons > 0) {
    return 'In progress';
  }

  // No failure reasons have outcomes = Not started
  return null;
}

module.exports = {
  getDgaReportStatus
};
