const _ = require('lodash')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { getDgaReportStatus } = require('../helpers/dgaReportStatus')

module.exports = router => {
  router.get('/cases/dga', async (req, res) => {
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Get all cases with DGA that have a nonCompliantDate
    const dgaCases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          { dga: { nonCompliantDate: { not: null } } },
          { unitId: { in: userUnitIds } }
        ]
      },
      include: {
        dga: {
          include: {
            failureReasons: true
          }
        }
      }
    })

    // Group cases by month (YYYY-MM format)
    const monthsMap = new Map()

    dgaCases.forEach(caseItem => {
      if (!caseItem.dga?.nonCompliantDate) return

      const date = new Date(caseItem.dga.nonCompliantDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          key: monthKey,
          name: monthName,
          deadline: caseItem.dga.reportDeadline,
          totalCases: 0,
          completedCases: 0,
          date: date
        })
      }

      const monthData = monthsMap.get(monthKey)
      monthData.totalCases++

      // Check if all failure reasons have outcomes
      const allCompleted = caseItem.dga.failureReasons.every(fr => fr.outcome !== null)
      if (allCompleted) {
        monthData.completedCases++
      }
    })

    // Convert to array and sort by date (most recent first)
    const months = Array.from(monthsMap.values()).sort((a, b) => b.date - a.date)

    res.render('cases/dga/index', {
      months
    })
  })

  // Show cases for a specific month, grouped by police unit
  router.get('/cases/dga/:month', async (req, res) => {
    const monthKey = req.params.month // Expected format: YYYY-MM (e.g., "2024-10")
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Parse the month key
    const [year, month] = monthKey.split('-').map(Number)

    if (!year || !month || month < 1 || month > 12) {
      return res.redirect('/cases/dga')
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1) // First day of month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month

    // Get all cases with DGA for this month
    const dgaCases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          {
            dga: {
              nonCompliantDate: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          { unitId: { in: userUnitIds } }
        ]
      },
      include: {
        unit: true,
        policeUnit: true,
        defendants: {
          include: {
            charges: true
          }
        },
        dga: {
          include: {
            failureReasons: true
          }
        }
      },
      orderBy: {
        policeUnit: {
          name: 'asc'
        }
      }
    })

    if (dgaCases.length === 0) {
      return res.redirect('/cases/dga')
    }

    // Group cases by police unit
    const policeUnitsMap = new Map()

    dgaCases.forEach(caseItem => {
      const policeUnitId = caseItem.policeUnitId || 0
      const policeUnitName = caseItem.policeUnit?.name || 'Not specified'

      if (!policeUnitsMap.has(policeUnitId)) {
        policeUnitsMap.set(policeUnitId, {
          id: policeUnitId,
          name: policeUnitName,
          cases: [],
          totalCases: 0,
          completedCases: 0,
          hasAnyProgress: false,
          sentDate: null,
          hasSentToPolice: false
        })
      }

      const unitData = policeUnitsMap.get(policeUnitId)
      unitData.cases.push(caseItem)
      unitData.totalCases++

      // Check if this case has been sent to police (they all should have same date)
      if (caseItem.dga.sentToPoliceDate && !unitData.hasSentToPolice) {
        unitData.sentDate = caseItem.dga.sentToPoliceDate
        unitData.hasSentToPolice = true
      }

      // Check if all failure reasons have outcomes (case is fully complete)
      const allCompleted = caseItem.dga.failureReasons.every(fr => fr.outcome !== null)
      if (allCompleted) {
        unitData.completedCases++
      }

      // Check if any failure reason has an outcome (case has progress)
      const hasAnyOutcome = caseItem.dga.failureReasons.some(fr => fr.outcome !== null)
      if (hasAnyOutcome) {
        unitData.hasAnyProgress = true
      }
    })

    // Convert to array for template, sorted alphabetically by police unit name
    const policeUnits = Array.from(policeUnitsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    // Get month details
    const monthName = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    const deadline = dgaCases[0]?.dga?.reportDeadline

    res.render('cases/dga/show', {
      monthKey,
      monthName,
      deadline,
      policeUnits,
      totalCases: dgaCases.length
    })
  })

  // Show cases for a specific police unit within a month
  router.get('/cases/dga/:month/:policeUnitId', async (req, res) => {
    const monthKey = req.params.month // Expected format: YYYY-MM (e.g., "2024-10")
    const policeUnitId = parseInt(req.params.policeUnitId)
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Parse the month key
    const [year, month] = monthKey.split('-').map(Number)

    if (!year || !month || month < 1 || month > 12) {
      return res.redirect('/cases/dga')
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1) // First day of month
    const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of month

    // Get all cases with DGA for this month
    const dgaCases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          {
            dga: {
              nonCompliantDate: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          { unitId: { in: userUnitIds } }
        ]
      },
      include: {
        unit: true,
        policeUnit: true,
        defendants: {
          include: {
            charges: true
          }
        },
        dga: {
          include: {
            failureReasons: true
          }
        }
      },
      orderBy: {
        reference: 'asc'
      }
    })

    if (dgaCases.length === 0) {
      return res.redirect('/cases/dga')
    }

    // Filter cases by police unit ID
    const casesForPoliceUnit = dgaCases.filter(c => {
      return c.policeUnitId === policeUnitId
    })

    if (casesForPoliceUnit.length === 0) {
      return res.redirect(`/cases/dga/${monthKey}`)
    }

    // Calculate report status for each case
    const casesWithStatus = casesForPoliceUnit.map(caseItem => {
      const outcomesTotal = caseItem.dga.failureReasons.length
      const outcomesCompleted = caseItem.dga.failureReasons.filter(fr => fr.outcome !== null).length

      return {
        ...caseItem,
        reportStatus: getDgaReportStatus(caseItem),
        outcomesTotal,
        outcomesCompleted
      }
    })

    // Get police unit name from first case
    const policeUnitName = casesForPoliceUnit[0].policeUnit?.name || 'Not specified'
    const monthName = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    res.render('cases/dga/police-unit', {
      monthKey,
      monthName,
      policeUnitId,
      policeUnitName,
      cases: casesWithStatus
    })
  })

  // Export cases for a specific police unit within a month
  router.get('/cases/dga/:month/:policeUnitId/export', async (req, res) => {
    const ExcelJS = require('exceljs')
    const monthKey = req.params.month
    const policeUnitId = parseInt(req.params.policeUnitId)
    const currentUser = req.session.data.user

    // Get user's unit IDs for filtering
    const userUnitIds = currentUser?.units?.map(uu => uu.unitId) || []

    // Parse the month key
    const [year, month] = monthKey.split('-').map(Number)

    if (!year || !month || month < 1 || month > 12) {
      return res.redirect('/cases/dga')
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    // Get all cases with DGA for this month and police unit
    const cases = await prisma.case.findMany({
      where: {
        AND: [
          { dga: { isNot: null } },
          {
            dga: {
              nonCompliantDate: {
                gte: startDate,
                lte: endDate
              }
            }
          },
          { unitId: { in: userUnitIds } },
          { policeUnitId: policeUnitId }
        ]
      },
      include: {
        unit: true,
        policeUnit: true,
        dga: {
          include: {
            failureReasons: true
          }
        }
      },
      orderBy: {
        reference: 'asc'
      }
    })

    if (cases.length === 0) {
      return res.redirect(`/cases/dga/${monthKey}`)
    }

    // Get police unit name for filename
    const policeUnitName = cases[0].policeUnit?.name || 'unknown'

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('DGA Outcomes Report')

    // Define columns (same as old export)
    worksheet.columns = [
      { header: 'URN', key: 'urn', width: 15 },
      { header: 'Casework Type', key: 'caseworkType', width: 20 },
      { header: 'Unit', key: 'unit', width: 20 },
      { header: 'Police Unit Name', key: 'policeUnitName', width: 20 },
      { header: 'Police unit', key: 'policeUnit', width: 15 },
      { header: 'Reviewing group', key: 'reviewingGroup', width: 20 },
      { header: 'Review Type All', key: 'reviewTypeAll', width: 20 },
      { header: 'Review', key: 'review', width: 15 },
      { header: 'Prosecutor\'s Declaration', key: 'prosecutorDeclaration', width: 25 },
      { header: 'Rape', key: 'rape', width: 10 },
      { header: 'Domestic violence', key: 'domesticViolence', width: 20 },
      { header: 'Hate Crime Flag', key: 'hateCrimeFlag', width: 20 },
      { header: 'Failure types', key: 'failureTypes', width: 30 },
      { header: 'Non-compliant DGA outcome', key: 'outcome', width: 30 },
      { header: 'Contact methods', key: 'contactMethods', width: 20 },
      { header: 'Comments', key: 'comments', width: 30 }
    ]

    // Style the header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    }

    // Add data rows - one row per failure reason
    cases.forEach(caseItem => {
      if (caseItem.dga && caseItem.dga.failureReasons && caseItem.dga.failureReasons.length > 0) {
        caseItem.dga.failureReasons.forEach(failureReason => {
          const outcomeText = failureReason.outcome || 'In progress'

          worksheet.addRow({
            urn: caseItem.reference,
            caseworkType: caseItem.type || '',
            unit: caseItem.unit?.name || '',
            policeUnitName: caseItem.policeUnit?.name || '',
            policeUnit: caseItem.policeUnitId || '',
            reviewingGroup: '',
            reviewTypeAll: '',
            review: '',
            prosecutorDeclaration: '',
            rape: '',
            domesticViolence: '',
            hateCrimeFlag: '',
            failureTypes: failureReason.reason,
            outcome: outcomeText,
            contactMethods: failureReason.methods || '',
            comments: failureReason.details || ''
          })
        })
      }
    })

    // Generate filename with month and police unit name
    const monthName = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      .toLowerCase()
      .replace(' ', '-')
    const safePoliceUnitName = policeUnitName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const filename = `dga-outcomes-${monthName}-${safePoliceUnitName}.xlsx`

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

    // Write to response
    await workbook.xlsx.write(res)
    res.end()
  })

}
