const createEmptySalesRecord = (year) => {
  const nestedObject = {
    totalReferredUsers: 0,
    totalLifetimeUsers: 0,
    totalYearlyUsers: 0,
    totalMonthlyUsers: 0,
    totalSales: 0,
    totalCommissions: 0,
    totalNewSales: 0,
    totalResidualSales: 0,
    totalNewCommissions: 0,
    totalResidualCommissions: 0,
  };

  return {
    year,
    ...nestedObject,
    January: { ...nestedObject },
    February: { ...nestedObject },
    March: { ...nestedObject },
    April: { ...nestedObject },
    May: { ...nestedObject },
    June: { ...nestedObject },
    July: { ...nestedObject },
    August: { ...nestedObject },
    September: { ...nestedObject },
    October: { ...nestedObject },
    November: { ...nestedObject },
    December: { ...nestedObject },
  };
};

module.exports.createEmptySalesRecord = createEmptySalesRecord;
