/**
 * Get completion status text based on completed/total counts
 * @param {number} completedCount - Number of completed items
 * @param {number} totalCount - Total number of items
 * @returns {string} - 'Completed', 'In progress', or 'Not started'
 */
function getCompletionStatus(completedCount, totalCount) {
  if (completedCount === totalCount && totalCount > 0) {
    return 'Completed'
  }
  if (completedCount > 0) {
    return 'In progress'
  }
  return 'Not started'
}

/**
 * Calculate the report status based on DGA failure reasons' outcomes
 * @param {Object} caseItem - Case object with dga.failureReasons array
 * @returns {string} - 'Completed', 'In progress', or 'Not started'
 */
function getDgaReportStatus(caseItem) {
  if (!caseItem?.dga?.failureReasons || caseItem.dga.failureReasons.length === 0) {
    return getCompletionStatus(0, 0)
  }

  const failureReasons = caseItem.dga.failureReasons
  const totalReasons = failureReasons.length
  const completedReasons = failureReasons.filter(fr => fr.outcome !== null).length

  return getCompletionStatus(completedReasons, totalReasons)
}

module.exports = {
  getCompletionStatus,
  getDgaReportStatus
}
